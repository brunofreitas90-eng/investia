import type { FinancialGoal } from '@/types';

const STORAGE_KEY = 'investia_financial_goal';

export function loadDemoGoal(): FinancialGoal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FinancialGoal;
  } catch {
    return null;
  }
}

export function saveDemoGoal(goal: FinancialGoal): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
}
