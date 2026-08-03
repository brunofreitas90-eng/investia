import {
  currentYield12m,
  sumDividendsLast12Months,
} from '@/lib/dividend-price-target';
import type { Quote, WatchlistItem } from '@/types';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';

export function enrichWatchlist(
  items: WatchlistItem[],
  quotes: Map<string, Quote>
): WatchlistItem[] {
  return items.map((item) => {
    const quote = quotes.get(item.ticker.toUpperCase());
    return {
      ...item,
      current_price: quote?.price,
      change_percent: quote?.changePercent,
    };
  });
}

/** DY 12 meses = soma dos proventos pagos ÷ preço atual. */
export async function enrichWatchlistWith12mYield(
  items: WatchlistItem[]
): Promise<WatchlistItem[]> {
  if (items.length === 0) return items;

  const uniqueTickers = [...new Set(items.map((i) => i.ticker.toUpperCase()))];
  const reports = await Promise.all(
    uniqueTickers.map(async (ticker) => {
      try {
        const report = await buildDividendHistoryReport(ticker);
        return [ticker, report] as const;
      } catch {
        return [ticker, null] as const;
      }
    })
  );
  const byTicker = new Map(reports);

  return items.map((item) => {
    const report = byTicker.get(item.ticker.toUpperCase());
    const price = item.current_price ?? report?.currentPrice ?? 0;
    if (!report?.payments?.length || price <= 0) {
      return { ...item, dividend_yield_12m: undefined };
    }

    const paid12m = sumDividendsLast12Months(report.payments);
    const yieldPct = currentYield12m(paid12m, price);
    return {
      ...item,
      dividend_yield_12m:
        yieldPct != null ? Math.round(yieldPct * 10) / 10 : undefined,
    };
  });
}
