import { loadJson } from '@/lib/demo-storage';
import type {
  Alert,
  FinancialGoal,
  Operation,
  PortfolioItem,
  UserPreferences,
  WatchlistItem,
} from '@/types';

export const PERSONAL_STORAGE_KEYS = {
  portfolio: 'investia_personal_portfolio',
  watchlist: 'investia_personal_watchlist',
  goal: 'investia_personal_goal',
  alerts: 'investia_personal_alerts',
  preferences: 'investia_personal_preferences',
  operations: 'investia_personal_operations',
} as const;

export const CLOUD_SYNCED_KEY = 'investia_cloud_synced_user';

export interface LocalPersonalSnapshot {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  goal: FinancialGoal | null;
  alerts: Alert[];
  preferences: Partial<UserPreferences> | null;
  operations: Operation[];
  totalItems: number;
}

export function readLocalPersonalSnapshot(): LocalPersonalSnapshot {
  const portfolio = loadJson<PortfolioItem[]>(PERSONAL_STORAGE_KEYS.portfolio) ?? [];
  const watchlist = loadJson<WatchlistItem[]>(PERSONAL_STORAGE_KEYS.watchlist) ?? [];
  const goal = loadJson<FinancialGoal>(PERSONAL_STORAGE_KEYS.goal);
  const alerts = loadJson<Alert[]>(PERSONAL_STORAGE_KEYS.alerts) ?? [];
  const preferences = loadJson<Partial<UserPreferences>>(PERSONAL_STORAGE_KEYS.preferences);
  const operations = loadJson<Operation[]>(PERSONAL_STORAGE_KEYS.operations) ?? [];

  const totalItems =
    portfolio.length +
    watchlist.length +
    alerts.length +
    operations.length +
    (goal ? 1 : 0) +
    (preferences ? 1 : 0);

  return {
    portfolio,
    watchlist,
    goal,
    alerts,
    preferences,
    operations,
    totalItems,
  };
}

export function hasLocalPersonalData(): boolean {
  const snap = readLocalPersonalSnapshot();
  return (
    snap.portfolio.length > 0 ||
    snap.watchlist.length > 0 ||
    snap.alerts.length > 0 ||
    snap.operations.length > 0 ||
    Boolean(snap.goal?.targetAmount)
  );
}

export function markCloudSynced(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLOUD_SYNCED_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function isCloudSyncedFor(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CLOUD_SYNCED_KEY) === userId;
  } catch {
    return false;
  }
}
