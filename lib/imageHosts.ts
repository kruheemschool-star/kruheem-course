// Hosts that next/image is allowed to optimize — must stay a subset of
// images.remotePatterns in next.config.ts, otherwise <Image> throws at runtime.
const OPTIMIZABLE_HOSTS = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'images.unsplash.com',
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
]);

export function canOptimizeImage(src: string | undefined | null): boolean {
    if (!src) return false;
    try {
        return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
    } catch {
        return false;
    }
}
