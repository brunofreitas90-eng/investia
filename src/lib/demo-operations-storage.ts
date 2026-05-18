import type { Operation } from '@/types';

const STORAGE_KEY = 'investia_operations';

export function loadDemoOperations(): Operation[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Operation[];
  } catch {
    return null;
  }
}

export function saveDemoOperations(ops: Operation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}
