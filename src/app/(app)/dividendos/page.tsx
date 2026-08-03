'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { DividendsDashboard } from '@/components/dividendos/dividends-dashboard';
import { DividendHistoryPanel } from '@/components/dividendos/dividend-history-panel';
import { cn } from '@/lib/utils';

type Tab = 'carteira' | 'historico';

export default function DividendosPage() {
  const [tab, setTab] = useState<Tab>('carteira');

  return (
    <PageWrapper
      title="Dividendos"
      subtitle="Totais mensais, calendário de pagamentos, histórico por empresa e proventos da carteira"
    >
      <div className="flex gap-2 mb-6">
        {(
          [
            ['carteira', 'Minha carteira'],
            ['historico', 'Histórico por empresa'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              tab === id
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'carteira' ? <DividendsDashboard /> : <DividendHistoryPanel />}
    </PageWrapper>
  );
}
