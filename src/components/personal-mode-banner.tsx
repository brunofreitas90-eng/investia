'use client';

import Link from 'next/link';
import { isPersonalModeClient } from '@/lib/personal-mode';
import { isDemoModeClient } from '@/lib/demo-mode';
import { hasLocalPersonalData } from '@/lib/migrate-personal-to-cloud';

export function PersonalModeBanner() {
  if (!isPersonalModeClient() || isDemoModeClient()) return null;

  const hasData = typeof window !== 'undefined' && hasLocalPersonalData();

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-center text-sm text-emerald-200/90">
      Carteira neste navegador apenas.
      {hasData ? (
        <>
          {' '}
          Para usar no celular e no PC:{' '}
          <Link
            href="/register?upgrade=1"
            className="font-medium text-emerald-300 underline underline-offset-2 hover:text-white"
          >
            criar conta na nuvem
          </Link>{' '}
          (os dados daqui serão sincronizados depois).
        </>
      ) : null}
    </div>
  );
}
