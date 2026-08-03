import { loadJson, saveJson } from '@/lib/demo-storage';
import type { FinancialGoal } from '@/types';

const STORAGE_KEY = 'investia_financial_goal';

export function loadDemoGoal(): FinancialGoal | null {
  return loadJson<FinancialGoal>(STORAGE_KEY);
}

export function saveDemoGoal(goal: FinancialGoal): void {
  saveJson(STORAGE_KEY, goal);
}
