import { loadJson, saveJson } from '@/lib/demo-storage';
import type { Alert } from '@/types';

const STORAGE_KEY = 'investia_alerts';

export function loadDemoAlerts(): Alert[] | null {
  return loadJson<Alert[]>(STORAGE_KEY);
}

export function saveDemoAlerts(alerts: Alert[]): void {
  saveJson(STORAGE_KEY, alerts);
}
