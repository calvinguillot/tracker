/**
 * Cache for Supabase storage signed URLs.
 * Prevents refetching image URLs when navigating between routes.
 * Invalidate explicitly when adding/updating entries with new images.
 */

const TTL_MS = 50 * 60 * 1000; // 50 min (URLs expire in 1h)
const cache = new Map<string, { url: string; expiresAt: number }>();

export function getCachedUrl(path: string): string | null {
	const entry = cache.get(path);
	if (!entry) return null;
	if (Date.now() >= entry.expiresAt) {
		cache.delete(path);
		return null;
	}
	return entry.url;
}

export function setCachedUrl(path: string, url: string, ttlMs = TTL_MS): void {
	cache.set(path, { url, expiresAt: Date.now() + ttlMs });
}

export function invalidateUrl(path: string): void {
	cache.delete(path);
}

export function invalidateAll(): void {
	cache.clear();
}
