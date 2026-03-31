/**
 * In-memory cache for Firestore data to prevent re-fetching on navigation.
 * Data is cached per-session (cleared on page refresh).
 * Each entry has a TTL (time-to-live) to ensure freshness.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or fetch fresh data if cache is expired/missing.
 * @param key Unique cache key (e.g. "courses", "posts")
 * @param fetcher Async function to fetch fresh data
 * @param ttl Time-to-live in ms (default 5 min)
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && (now - entry.timestamp) < ttl) {
    return entry.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

/**
 * Invalidate a specific cache entry.
 */
export function invalidateCache(key: string) {
  cache.delete(key);
}

/**
 * Clear all cached data.
 */
export function clearAllCache() {
  cache.clear();
}
