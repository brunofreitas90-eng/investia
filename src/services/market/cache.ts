const memoryCache = new Map<string, { data: unknown; expires: number }>();

/** TTLs em segundos — reduz consumo de APIs externas */
export const CACHE_TTL = {
  quote: 120,
  fundamentals: 600,
  dividends: 3600,
  history: 1800,
  riReport: 900,
  aiAnalysis: 1800,
  marketScan: 600,
} as const;

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
