'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { RankingDashboard } from '@/components/ranking/ranking-dashboard';

export default function RankingPage() {
  return (
    <PageWrapper
      title="Ranking de Ativos"
      subtitle="Compare performances da carteira, watchlist e mercado"
    >
      <RankingDashboard />
    </PageWrapper>
  );
}
