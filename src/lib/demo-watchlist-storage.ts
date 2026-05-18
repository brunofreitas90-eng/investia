import type { WatchlistItem } from '@/types';

const STORAGE_KEY = 'investia_watchlist';

export function loadDemoWatchlist(): WatchlistItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WatchlistItem[];
  } catch {
    return null;
  }
}

export function saveDemoWatchlist(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
