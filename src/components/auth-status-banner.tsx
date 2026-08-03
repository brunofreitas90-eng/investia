'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

type Health = {
  supabase: boolean;
  openai: boolean;
  authAvailable: boolean;
};

export function AuthStatusBanner() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth({ supabase: false, openai: false, authAvailable: false }));
  }, []);

  if (!health || health.authAvailable) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <div className="flex gap-2">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
        <div className="space-y-1">
          <p className="font-medium">Login com email temporariamente indisponível</p>
          <p className="text-amber-200/80">
            O servidor de contas (Supabase) não está acessível. Use o{' '}
            <Link href="/api/demo/start" className="text-emerald-400 underline">
              modo demo
            </Link>{' '}
            para usar o app completo neste aparelho, ou tente novamente mais tarde.
          </p>
        </div>
      </div>
    </div>
  );
}
