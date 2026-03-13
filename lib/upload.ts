import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import imageCompression from "browser-image-compression";

const COMPRESSION_TIMEOUT = 10_000; // 10 seconds max for compression
const COMPRESSION_THRESHOLD = 1 * 1024 * 1024; // Compress files > 1MB

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
        const options = {
            maxSizeMB: compressOptions.maxSizeMB || 0.8,
            maxWidthOrHeight: compressOptions.maxWidthOrHeight || 1920,
            useWebWorker: true,
            initialQuality: 0.85
        };

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

    // Upload to Firebase
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, finalFile);
    return getDownloadURL(snapshot.ref);
}
