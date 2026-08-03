import { loadJson, saveJson } from '@/lib/demo-storage';
import type { WatchlistItem } from '@/types';

const STORAGE_KEY = 'investia_watchlist';

export function loadDemoWatchlist(): WatchlistItem[] | null {
  return loadJson<WatchlistItem[]>(STORAGE_KEY);
}

export function saveDemoWatchlist(items: WatchlistItem[]): void {
  saveJson(STORAGE_KEY, items);
}
