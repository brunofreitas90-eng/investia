import { isDemoModeClient } from '@/lib/demo-mode';
import { isPersonalModeClient } from '@/lib/personal-mode';

export type ClientDataMode = 'demo' | 'personal' | 'cloud';

export function getClientDataMode(): ClientDataMode {
  if (isDemoModeClient()) return 'demo';
  if (isPersonalModeClient()) return 'personal';
  return 'cloud';
}

export function isLocalClientMode(): boolean {
  const mode = getClientDataMode();
  return mode === 'demo' || mode === 'personal';
}
