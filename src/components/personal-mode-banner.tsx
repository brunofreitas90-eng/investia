'use client';

import { isPersonalModeClient } from '@/lib/personal-mode';
import { isDemoModeClient } from '@/lib/demo-mode';

export function PersonalModeBanner() {
  if (!isPersonalModeClient() || isDemoModeClient()) return null;

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-center text-sm text-emerald-200/90">
      Carteira pessoal — seus dados ficam salvos neste navegador.
    </div>
  );
}
