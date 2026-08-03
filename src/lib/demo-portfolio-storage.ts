import { loadJson, saveJson } from '@/lib/demo-storage';
import { isDemoModeClient } from '@/lib/demo-mode';
import type { PortfolioItem } from '@/types';

const STORAGE_KEY = 'investia_portfolio';

export { isDemoModeClient };

export function loadDemoPortfolio(): PortfolioItem[] | null {
  return loadJson<PortfolioItem[]>(STORAGE_KEY);
}

export function saveDemoPortfolio(items: PortfolioItem[]): void {
  saveJson(STORAGE_KEY, items);
}
