import type { Quote, CompanyFundamentals } from '@/types';
import { fetchBrapiQuote, fetchBrapiFundamentals } from './brapi';
import { fetchYahooQuote, fetchYahooHistory } from './yahoo';
import { isBrazilianTicker } from '@/lib/utils';

export async function getQuote(ticker: string): Promise<Quote | null> {
  const providers = isBrazilianTicker(ticker)
    ? [fetchBrapiQuote, fetchYahooQuote]
    : [fetchYahooQuote, fetchBrapiQuote];

  for (const provider of providers) {
    const quote = await provider(ticker);
    if (quote && quote.price > 0) return quote;
  }
  return null;
}

export async function getQuotes(tickers: string[]): Promise<Map<string, Quote>> {
  const map = new Map<string, Quote>();
  await Promise.all(
    tickers.map(async (t) => {
      const q = await getQuote(t);
      if (q) map.set(t.toUpperCase(), q);
    })
  );
  return map;
}

export async function getFundamentals(ticker: string): Promise<CompanyFundamentals | null> {
  const br = await fetchBrapiFundamentals(ticker);
  if (br) return br;
  return null;
}

export async function getPriceHistory(
  ticker: string,
  range = '1y'
): Promise<{ date: string; close: number }[]> {
  return fetchYahooHistory(ticker, range);
}

export { fetchYahooHistory, getQuote as fetchQuote };
