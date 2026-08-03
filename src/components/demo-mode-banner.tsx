'use client';

import { isDemoModeClient } from '@/lib/demo-mode';

export function DemoModeBanner() {
  if (!isDemoModeClient()) return null;

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200">
      Modo demo — seus lançamentos ficam salvos neste navegador. Para sincronizar na nuvem, faça login
      quando o Supabase estiver configurado.
    </div>
  );
}
