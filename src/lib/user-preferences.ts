import type { UserPreferences } from '@/types';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultCurrency: 'BRL',
  notifyEmail: true,
  notifyApp: true,
  compactDashboard: false,
  showPatrimonyChart: true,
  defaultRiskProfile: 'moderate',
  language: 'pt-BR',
};

export function mergePreferences(
  partial?: Partial<UserPreferences> | null
): UserPreferences {
  return { ...DEFAULT_USER_PREFERENCES, ...partial };
}
