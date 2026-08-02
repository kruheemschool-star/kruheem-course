import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import imageCompression from "browser-image-compression";

const COMPRESSION_TIMEOUT = 10_000; // 10 seconds max for compression
const COMPRESSION_THRESHOLD = 500 * 1024; // Compress files > 500KB

/**
 * Compresses an image with a hard timeout to prevent hanging on mobile/slow devices.
 */
async function compressWithTimeout(file: File, options: any, timeoutMs: number): Promise<File | Blob> {
    const compressionPromise = imageCompression(file, options);
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('COMPRESSION_TIMEOUT')), timeoutMs)
    );
    return Promise.race([compressionPromise, timeoutPromise]);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Reads the PNG header to classify alpha usage without decoding pixels.
 * 'no-alpha'    — color type 0/2/3 with no tRNS chunk: provably opaque.
 * 'maybe-alpha' — an alpha channel or tRNS exists; pixels may still all be opaque.
 * 'unknown'     — not a well-formed PNG (or truncated scan).
 */
function pngAlphaFromHeader(bytes: Uint8Array): 'no-alpha' | 'maybe-alpha' | 'unknown' {
    if (bytes.length < 33) return 'unknown';
    for (let i = 0; i < 8; i++) {
        if (bytes[i] !== PNG_SIGNATURE[i]) return 'unknown';
    }
    // IHDR is always the first chunk: length(4) 'IHDR'(4) width(4) height(4) depth(1) colorType(1)
    if (!(bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52)) return 'unknown';
    const colorType = bytes[25];
    if (colorType === 4 || colorType === 6) return 'maybe-alpha';
    if (colorType !== 0 && colorType !== 2 && colorType !== 3) return 'unknown';
    // Color types 0/2/3 are only transparent via a tRNS chunk, which must precede IDAT.
    let off = 33;
    while (off + 8 <= bytes.length) {
        const len = (bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];
        if (len < 0) return 'unknown';
        const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        if (type === 'tRNS') return 'maybe-alpha';
        if (type === 'IDAT' || type === 'IEND') return 'no-alpha';
        off += 12 + len;
    }
    return 'unknown';
}

/**
 * Exact full-resolution alpha scan. Draws the image 1:1 in tiles (never
 * downsampled — downscaling can skip small transparent regions like rounded
 * corners entirely) onto a bounded canvas, so memory stays low and iOS
 * canvas-size limits are never hit. Early-exits on the first transparent pixel.
 */
async function imageHasTransparentPixel(file: File): Promise<boolean> {
    const bitmap = await createImageBitmap(file);
    try {
        const TILE = 1024;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return true;
        for (let y = 0; y < bitmap.height; y += TILE) {
            for (let x = 0; x < bitmap.width; x += TILE) {
                const w = Math.min(TILE, bitmap.width - x);
                const h = Math.min(TILE, bitmap.height - y);
                canvas.width = w;
                canvas.height = h;
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
                const data = ctx.getImageData(0, 0, w, h).data;
                for (let i = 3; i < data.length; i += 4) {
                    if (data[i] < 250) return true;
                }
            }
        }
        return false;
    } finally {
        bitmap.close();
    }
}

/**
 * Checks whether a PNG actually uses transparency.
 * Returns true when unsure — callers must treat "true" as "do not convert".
 */
async function pngHasTransparency(file: File): Promise<boolean> {
    try {
        const header = pngAlphaFromHeader(new Uint8Array(await file.arrayBuffer()));
        if (header === 'no-alpha') return false;
        // Alpha channel present (or malformed file) — verify against real pixels.
        return await imageHasTransparentPixel(file);
    } catch {
        return true;
    }
}

/**
 * Standardized utility to upload an image to Firebase Storage.
 * Automatically compresses the image if it exceeds the threshold to save bandwidth and storage.
 * 
 * @param file The raw File object from an input.
 * @param storagePath The destination path in Firebase Storage (e.g., `blog-content/${Date.now()}_img.jpg`).
 * @param compressOptions Optional custom compression options.
 * @returns A promise that resolves to the download URL.
 */
export async function uploadImageToStorage(
    file: File,
    storagePath: string,
    compressOptions: { maxSizeMB?: number, maxWidthOrHeight?: number } = { maxSizeMB: 0.8, maxWidthOrHeight: 1920 }
): Promise<string> {
    let finalFile: File | Blob = file;

    // Only compress images, and only if they exceed the threshold
    if (file.type.startsWith('image/') && file.size > COMPRESSION_THRESHOLD) {
        const options: {
            maxSizeMB: number;
            maxWidthOrHeight: number;
            useWebWorker: boolean;
            initialQuality: number;
            fileType?: string;
        } = {
            maxSizeMB: compressOptions.maxSizeMB || 0.8,
            maxWidthOrHeight: compressOptions.maxWidthOrHeight || 1920,
            useWebWorker: true,
            initialQuality: 0.85
        };

        // PNG can't be size-reduced by quality iteration (lossless), so large
        // screenshots stay at 2-5MB. Convert to JPEG — but only when the image
        // has no real transparency, since JPEG would flatten alpha to white.
        if (file.type === 'image/png' && !(await pngHasTransparency(file))) {
            options.fileType = 'image/jpeg';
        }

        try {
            // Attempt 1: With Web Worker + timeout
            finalFile = await compressWithTimeout(file, options, COMPRESSION_TIMEOUT);
        } catch (workerErr: any) {
            console.warn('Compression attempt 1 failed:', workerErr?.message);
            try {
                // Attempt 2: Without Web Worker + timeout (for some in-app browsers)
                finalFile = await compressWithTimeout(
                    file,
                    { ...options, useWebWorker: false },
                    COMPRESSION_TIMEOUT
                );
            } catch (fallbackErr: any) {
                console.warn('All compression failed, using original file:', fallbackErr?.message);
                // All compression failed or timed out — use original file
                finalFile = file;
            }
        }
    }

    // Upload to Firebase. Every caller uses a Date.now()-based path (nothing is
    // ever overwritten in place), so a long immutable cache is safe. Without
    // this, Firebase serves `private, max-age=0` — browsers/CDN re-download the
    // full image on every view, which is billed Storage bandwidth.
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, finalFile, {
        cacheControl: "public, max-age=31536000, immutable",
    });
    return getDownloadURL(snapshot.ref);
}
