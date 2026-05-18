import type { Quote, CompanyFundamentals } from '@/types';
import { cacheKey, getCache, setCache } from './cache';
import { normalizeTicker } from '@/lib/utils';

const BASE = 'https://brapi.dev/api';

export async function fetchBrapiQuote(ticker: string): Promise<Quote | null> {
  const t = normalizeTicker(ticker);
  const key = cacheKey('quote', 'brapi', t);
  const cached = getCache<Quote>(key);
  if (cached) return cached;

  try {
    const token = process.env.BRAPI_TOKEN ? `?token=${process.env.BRAPI_TOKEN}` : '';
    const res = await fetch(`${BASE}/quote/${t}${token}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return null;

    const quote: Quote = {
      ticker: t,
      name: r.longName || r.shortName,
      price: r.regularMarketPrice ?? 0,
      change: r.regularMarketChange ?? 0,
      changePercent: r.regularMarketChangePercent ?? 0,
      high: r.regularMarketDayHigh,
      low: r.regularMarketDayLow,
      volume: r.regularMarketVolume,
      marketCap: r.marketCap,
      currency: 'BRL',
      source: 'brapi',
      updatedAt: new Date().toISOString(),
    };
    setCache(key, quote, 60);
    return quote;
  } catch {
    return null;
  }
}

export async function fetchBrapiFundamentals(ticker: string): Promise<CompanyFundamentals | null> {
  const t = normalizeTicker(ticker);
  const key = cacheKey('fund', 'brapi', t);
  const cached = getCache<CompanyFundamentals>(key);
  if (cached) return cached;

  try {
    const token = process.env.BRAPI_TOKEN ? `?token=${process.env.BRAPI_TOKEN}` : '';
    const res = await fetch(`${BASE}/quote/${t}${token}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return null;

    const fund: CompanyFundamentals = {
      ticker: t,
      name: r.longName,
      sector: r.sector,
      pe: r.priceEarnings,
      pb: r.priceToBook,
      roe: r.returnOnEquity,
      dividendYield: r.dividendYield,
      marketCap: r.marketCap,
      source: 'brapi',
    };
    setCache(key, fund, 3600);
    return fund;
  } catch {
    return null;
  }
}

export async function fetchBrapiList(): Promise<string[]> {
  const key = cacheKey('list', 'brapi');
  const cached = getCache<string[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${BASE}/available`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = await res.json();
    const stocks: string[] = json.stocks || [];
    setCache(key, stocks, 86400);
    return stocks;
  } catch {
    return [];
  }
}
