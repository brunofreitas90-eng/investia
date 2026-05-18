'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { DividendsDashboard } from '@/components/dividendos/dividends-dashboard';

export default function DividendosPage() {
  return (
    <PageWrapper
      title="Dividendos"
      subtitle="Proventos calculados com base na sua carteira"
    >
      <DividendsDashboard />
    </PageWrapper>
  );
}
