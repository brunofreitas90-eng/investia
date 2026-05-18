import type { Quote, WatchlistItem } from '@/types';

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
