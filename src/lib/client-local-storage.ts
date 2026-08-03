import {
  demoPortfolio,
  demoWatchlist,
  demoFinancialGoal,
  demoAlerts,
  demoOperations,
} from '@/lib/demo-data';
import { getClientDataMode } from '@/lib/client-data-mode';
import { loadDemoPortfolio, saveDemoPortfolio } from '@/lib/demo-portfolio-storage';
import { loadJson, saveJson } from '@/lib/demo-storage';
import { mergePreferences } from '@/lib/user-preferences';
import type {
  Alert,
  FinancialGoal,
  Operation,
  PortfolioItem,
  UserPreferences,
  WatchlistItem,
} from '@/types';

const PERSONAL_PORTFOLIO_KEY = 'investia_personal_portfolio';
const LEGACY_PORTFOLIO_KEY = 'investia_portfolio';

function loadWithLegacy<T>(personalKey: string, legacyKey: string): T | null {
  const personal = loadJson<T>(personalKey);
  if (personal) return personal;
  const legacy = loadJson<T>(legacyKey);
  if (legacy) {
    saveJson(personalKey, legacy);
    return legacy;
  }
  return null;
}

function isDemoSeedPortfolio(items: PortfolioItem[]): boolean {
  if (items.length !== demoPortfolio.length) return false;
  return items.every((item, i) => item.ticker === demoPortfolio[i]?.ticker);
}

function loadPersonalPortfolio(): PortfolioItem[] {
  const personal = loadJson<PortfolioItem[]>(PERSONAL_PORTFOLIO_KEY);
  if (personal?.length) return personal;

  const legacy = loadJson<PortfolioItem[]>(LEGACY_PORTFOLIO_KEY);
  if (legacy?.length && !isDemoSeedPortfolio(legacy)) {
    saveJson(PERSONAL_PORTFOLIO_KEY, legacy);
    return legacy;
  }

  return [];
}

function savePersonalPortfolio(items: PortfolioItem[]): void {
  saveJson(PERSONAL_PORTFOLIO_KEY, items);
}

export function loadClientPortfolio(): PortfolioItem[] {
  const mode = getClientDataMode();
  if (mode === 'demo') {
    const stored = loadDemoPortfolio();
    return stored?.length ? stored : demoPortfolio;
  }
  if (mode === 'personal') {
    return loadPersonalPortfolio();
  }
  return [];
}

export function saveClientPortfolio(items: PortfolioItem[]): void {
  const mode = getClientDataMode();
  if (mode === 'demo') saveDemoPortfolio(items);
  else if (mode === 'personal') savePersonalPortfolio(items);
}

export function loadClientWatchlist(): WatchlistItem[] {
  const mode = getClientDataMode();
  if (mode === 'demo') {
    return loadJson<WatchlistItem[]>('investia_watchlist') ?? demoWatchlist;
  }
  if (mode === 'personal') {
    return loadWithLegacy<WatchlistItem[]>('investia_personal_watchlist', 'investia_watchlist') ?? [];
  }
  return [];
}

export function saveClientWatchlist(items: WatchlistItem[]): void {
  const mode = getClientDataMode();
  const key = mode === 'personal' ? 'investia_personal_watchlist' : 'investia_watchlist';
  saveJson(key, items);
}

export function loadClientGoal(): FinancialGoal | null {
  const mode = getClientDataMode();
  if (mode === 'demo') {
    return loadJson<FinancialGoal>('investia_financial_goal') ?? demoFinancialGoal;
  }
  if (mode === 'personal') {
    return loadWithLegacy<FinancialGoal>('investia_personal_goal', 'investia_financial_goal');
  }
  return null;
}

export function saveClientGoal(goal: FinancialGoal): void {
  const mode = getClientDataMode();
  const key = mode === 'personal' ? 'investia_personal_goal' : 'investia_financial_goal';
  saveJson(key, goal);
}

export function loadClientAlerts(): Alert[] {
  const mode = getClientDataMode();
  if (mode === 'demo') {
    return loadJson<Alert[]>('investia_alerts') ?? demoAlerts;
  }
  if (mode === 'personal') {
    return loadWithLegacy<Alert[]>('investia_personal_alerts', 'investia_alerts') ?? [];
  }
  return [];
}

export function saveClientAlerts(alerts: Alert[]): void {
  const mode = getClientDataMode();
  const key = mode === 'personal' ? 'investia_personal_alerts' : 'investia_alerts';
  saveJson(key, alerts);
}

export function loadClientPreferences(): UserPreferences {
  const mode = getClientDataMode();
  if (mode === 'personal') {
    const stored = loadWithLegacy<Partial<UserPreferences>>(
      'investia_personal_preferences',
      'investia_preferences'
    );
    return mergePreferences(stored ?? undefined);
  }
  const stored = loadJson<Partial<UserPreferences>>('investia_preferences');
  return mergePreferences(stored ?? undefined);
}

export function saveClientPreferences(prefs: UserPreferences): void {
  const mode = getClientDataMode();
  const key = mode === 'personal' ? 'investia_personal_preferences' : 'investia_preferences';
  saveJson(key, prefs);
}

export function loadClientOperations(): Operation[] {
  const mode = getClientDataMode();
  if (mode === 'demo') {
    return loadJson<Operation[]>('investia_operations') ?? demoOperations;
  }
  if (mode === 'personal') {
    return loadWithLegacy<Operation[]>('investia_personal_operations', 'investia_operations') ?? [];
  }
  return [];
}

export function saveClientOperations(ops: Operation[]): void {
  const mode = getClientDataMode();
  const key = mode === 'personal' ? 'investia_personal_operations' : 'investia_operations';
  saveJson(key, ops);
}

export function clientItemPrefix(): string {
  return getClientDataMode() === 'personal' ? 'personal' : 'demo';
}

export function clientUserId(): string {
  return getClientDataMode() === 'personal' ? 'personal' : 'demo';
}
