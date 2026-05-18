'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { TaxDashboard } from '@/components/imposto/tax-dashboard';

export default function ImpostoPage() {
  return (
    <PageWrapper
      title="Imposto de Renda"
      subtitle="DARF, isenção de R$ 20 mil e operações da carteira"
    >
      <TaxDashboard />
    </PageWrapper>
  );
}
