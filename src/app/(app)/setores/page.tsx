'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { SectorDividendRankPanel } from '@/components/setores/sector-dividend-rank-panel';

export default function SetoresPage() {
  return (
    <PageWrapper
      title="Ranking por Setor"
      subtitle="Bancos, seguradoras, energia e saneamento — do que mais paga ao que menos paga"
    >
      <SectorDividendRankPanel />
    </PageWrapper>
  );
}
