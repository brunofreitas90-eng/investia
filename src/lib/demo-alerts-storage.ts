import type { Alert } from '@/types';

const STORAGE_KEY = 'investia_alerts';

export function loadDemoAlerts(): Alert[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Alert[];
  } catch {
    return null;
  }
}

export function saveDemoAlerts(alerts: Alert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}
