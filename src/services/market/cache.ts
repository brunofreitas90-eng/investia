const memoryCache = new Map<string, { data: unknown; expires: number }>();

export function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlSeconds = 300): void {
  memoryCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

export function cacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`.toUpperCase();
}
