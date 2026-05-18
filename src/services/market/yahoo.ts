import type { Quote } from '@/types';
import { cacheKey, getCache, setCache } from './cache';
import { normalizeTicker, isBrazilianTicker } from '@/lib/utils';

export async function fetchYahooQuote(ticker: string): Promise<Quote | null> {
  const t = normalizeTicker(ticker);
  const symbol = isBrazilianTicker(t) ? `${t}.SA` : t;
  const key = cacheKey('quote', 'yahoo', symbol);
  const cached = getCache<Quote>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;

    const quote: Quote = {
      ticker: t,
      name: meta.longName || meta.shortName,
      price,
      change,
      changePercent,
      currency: isBrazilianTicker(t) ? 'BRL' : 'USD',
      source: 'yahoo',
      updatedAt: new Date().toISOString(),
    };
    setCache(key, quote, 60);
    return quote;
  } catch {
    return null;
  }
}

export async function fetchYahooHistory(
  ticker: string,
  range = '1y'
): Promise<{ date: string; close: number }[]> {
  const t = normalizeTicker(ticker);
  const symbol = isBrazilianTicker(t) ? `${t}.SA` : t;
  const key = cacheKey('history', 'yahoo', symbol, range);
  const cached = getCache<{ date: string; close: number }[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const result = json.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closes: number[] = result?.indicators?.quote?.[0]?.close || [];

    const history = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i],
      }))
      .filter((h) => h.close != null);

    setCache(key, history, 3600);
    return history;
  } catch {
    return [];
  }
}
