'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { AlertsDashboard } from '@/components/alertas/alerts-dashboard';

export default function AlertasPage() {
  return (
    <PageWrapper
      title="Alertas Inteligentes"
      subtitle="Preço, lucro/prejuízo e datas de proventos da sua carteira"
    >
      <AlertsDashboard />
    </PageWrapper>
  );
}
