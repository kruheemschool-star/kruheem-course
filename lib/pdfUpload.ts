import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const UPLOAD_TIMEOUT = 300_000; // 5 min — master exams can be large

/**
 * Upload a raw file (no compression) to Storage with progress + a hard timeout.
 * Returns the storage PATH (not a URL) — the master PDF must stay private, so we
 * deliberately do NOT call getDownloadURL on it. Use uploadPublicFile() instead
 * for covers/previews that are meant to be world-readable.
 */
export function uploadPrivateFile(
    file: File,
    storagePath: string,
    onProgress?: (pct: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, storagePath), file, {
            contentType: file.type || "application/octet-stream",
        });
        const timer = setTimeout(() => { task.cancel(); reject(new Error("UPLOAD_TIMEOUT")); }, UPLOAD_TIMEOUT);
        task.on(
            "state_changed",
            (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => { clearTimeout(timer); reject(err); },
            () => { clearTimeout(timer); resolve(storagePath); },
        );
    });
}

/**
 * Upload a file that IS meant to be public (cover image, free preview PDF) and
 * return its download URL.
 */
export function uploadPublicFile(
    file: File,
    storagePath: string,
    onProgress?: (pct: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, storagePath), file, {
            contentType: file.type || "application/octet-stream",
        });
        const timer = setTimeout(() => { task.cancel(); reject(new Error("UPLOAD_TIMEOUT")); }, UPLOAD_TIMEOUT);
        task.on(
            "state_changed",
            (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => { clearTimeout(timer); reject(err); },
            async () => {
                clearTimeout(timer);
                try { resolve(await getDownloadURL(task.snapshot.ref)); }
                catch (e) { reject(e); }
            },
        );
    });
}
