import type { PortfolioItem } from '@/types';

const STORAGE_KEY = 'investia_portfolio';

export function loadDemoPortfolio(): PortfolioItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortfolioItem[];
  } catch {
    return null;
  }
}

export function saveDemoPortfolio(items: PortfolioItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function isDemoModeClient(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('demo_mode=1');
}
