import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

// Storage prefixes that belong to the article system. Cleanup never touches
// anything outside these, so course/lesson/exam images are structurally safe.
const MANAGED_PREFIXES = ["posts/", "blog-content/", "summaries/"];

// Collections whose documents may reference article images. Both are scanned
// before any delete so an image shared across articles is never removed.
const ARTICLE_COLLECTIONS = ["posts", "summaries"] as const;

const URL_RE = /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?"'\s\\)]+)\?alt=media/g;

/**
 * Extracts managed-storage object paths from any document data (scans the
 * whole JSON so new image fields are picked up automatically).
 */
export function extractManagedImagePaths(data: unknown): Set<string> {
    const out = new Set<string>();
    const text = JSON.stringify(data ?? "");
    for (const m of text.matchAll(URL_RE)) {
        const objectPath = decodeURIComponent(m[1]);
        if (MANAGED_PREFIXES.some((p) => objectPath.startsWith(p))) out.add(objectPath);
    }
    return out;
}

/**
 * Reads one article and returns its managed image paths.
 * Call BEFORE deleteDoc — afterwards the URLs are gone with the document.
 */
export async function collectArticleImagePaths(
    col: "posts" | "summaries",
    id: string
): Promise<Set<string>> {
    try {
        const snap = await getDoc(doc(db, col, id));
        return snap.exists() ? extractManagedImagePaths(snap.data()) : new Set();
    } catch (e) {
        console.warn("collectArticleImagePaths failed:", e);
        return new Set();
    }
}

/**
 * Deletes the candidate images that no remaining article references.
 * Call AFTER deleteDoc succeeded. Never throws — a failed file delete just
 * leaves an orphan (same as before this system existed), while the article
 * delete itself already went through.
 */
export async function purgeUnreferencedArticleImages(
    candidates: Set<string>
): Promise<{ deleted: number; kept: number; failed: number }> {
    const result = { deleted: 0, kept: 0, failed: 0 };
    if (candidates.size === 0) return result;

    try {
        const referenced = new Set<string>();
        for (const col of ARTICLE_COLLECTIONS) {
            const snap = await getDocs(collection(db, col));
            snap.forEach((d) => extractManagedImagePaths(d.data()).forEach((p) => referenced.add(p)));
        }

        const toDelete = [...candidates].filter((p) => !referenced.has(p));
        result.kept = candidates.size - toDelete.length;

        const settled = await Promise.allSettled(toDelete.map((p) => deleteObject(ref(storage, p))));
        for (const s of settled) {
            if (s.status === "fulfilled") result.deleted++;
            else if ((s.reason as { code?: string })?.code === "storage/object-not-found") result.deleted++;
            else result.failed++;
        }
        if (result.failed > 0) console.warn(`purgeUnreferencedArticleImages: ${result.failed} file(s) failed to delete`);
    } catch (e) {
        console.warn("purgeUnreferencedArticleImages failed:", e);
        result.failed = candidates.size;
    }
    return result;
}
