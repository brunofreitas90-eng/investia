import { cacheKey, getCache, setCache } from './cache';
import { normalizeTicker } from '@/lib/utils';

const BASE = 'https://brapi.dev/api';

export interface BrapiDividend {
  paymentDate?: string;
  lastDatePrior?: string;
  approvedOn?: string;
  rate: number;
  label?: string;
}

export interface BrapiFullData {
  symbol: string;
  longName?: string;
  shortName?: string;
  sector?: string;
  regularMarketPrice: number;
  marketCap?: number;
  priceEarnings?: number;
  priceToBook?: number;
  returnOnEquity?: number;
  earningsPerShare?: number;
  dividendYield?: number;
  profitMargins?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  historicalDataPrice?: { date: number; close: number; open?: number; high?: number; low?: number }[];
  dividendsData?: {
    cashDividends?: BrapiDividend[];
  };
}

function tokenQuery(extra = ''): string {
  const token = process.env.BRAPI_TOKEN;
  const sep = extra.includes('?') ? '&' : '?';
  return token ? `${extra}${sep}token=${token}` : extra;
}

export async function fetchBrapiFullData(
  ticker: string,
  options?: { range?: string }
): Promise<BrapiFullData | null> {
  const t = normalizeTicker(ticker);
  const range = options?.range ?? '10y';
  const key = cacheKey('full', 'brapi', t, range);
  const cached = getCache<BrapiFullData>(key);
  if (cached) return cached;

  try {
    const qs = tokenQuery(
      `?range=${encodeURIComponent(range)}&interval=1d&dividends=true&fundamental=true`
    );
    const res = await fetch(`${BASE}/quote/${t}${qs}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0] as BrapiFullData | undefined;
    if (!r?.regularMarketPrice && !r?.dividendsData?.cashDividends?.length) return null;
    setCache(key, r, 300);
    return r;
  } catch {
    return null;
  }
}
