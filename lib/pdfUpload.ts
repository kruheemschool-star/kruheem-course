import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

const UPLOAD_TIMEOUT = 300_000; // 5 min — master exams can be large

/**
 * Delete a file from Storage by its path. Used when an exam paper's cover,
 * preview, or master PDF is replaced or the paper itself is deleted — without
 * this, every re-upload/edit leaves the old file behind forever, quietly
 * growing Storage usage (and cost) with orphaned files nobody can reach.
 * Silently no-ops on a missing path or an already-deleted object.
 */
export async function deleteStorageFile(path?: string | null): Promise<void> {
    if (!path) return;
    try {
        await deleteObject(ref(storage, path));
    } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== "storage/object-not-found") throw err;
    }
}

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
