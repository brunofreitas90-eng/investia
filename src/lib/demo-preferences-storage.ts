import { mergePreferences } from '@/lib/user-preferences';
import type { UserPreferences } from '@/types';

const STORAGE_KEY = 'investia_preferences';

export function loadDemoPreferences(): UserPreferences {
  if (typeof window === 'undefined') return mergePreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergePreferences();
    return mergePreferences(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return mergePreferences();
  }
}

export function saveDemoPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
