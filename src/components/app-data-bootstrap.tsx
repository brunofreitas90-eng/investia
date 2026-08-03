'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isDemoModeClient } from '@/lib/demo-mode';
import { isPersonalModeClient } from '@/lib/personal-mode';

export function AppDataBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(
    () => isDemoModeClient() || isPersonalModeClient()
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isDemoModeClient() || isPersonalModeClient()) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const res = await fetch('/api/auth/session-status', {
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
        });
        const status = (await res.json()) as { mode: string };

        if (
          status.mode === 'personal' ||
          status.mode === 'demo' ||
          status.mode === 'cloud'
        ) {
          if (!cancelled) setReady(true);
          return;
        }

        if (!cancelled) router.replace('/login');
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050506]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return <>{children}</>;
}
