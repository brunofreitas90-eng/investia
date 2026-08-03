import { loadJson, saveJson } from '@/lib/demo-storage';
import { mergePreferences } from '@/lib/user-preferences';
import type { UserPreferences } from '@/types';

const STORAGE_KEY = 'investia_preferences';

export function loadDemoPreferences(): UserPreferences {
  const stored = loadJson<Partial<UserPreferences>>(STORAGE_KEY);
  return mergePreferences(stored ?? undefined);
}

export function saveDemoPreferences(prefs: UserPreferences): void {
  saveJson(STORAGE_KEY, prefs);
}
