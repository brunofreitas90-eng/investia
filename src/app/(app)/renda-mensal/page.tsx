'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { MonthlyIncomeSimulator } from '@/components/simuladores/monthly-income-simulator';

export default function RendaMensalPage() {
  return (
    <PageWrapper
      title="Renda Mensal"
      subtitle="Monte uma carteira para viver de dividendos — projeção e capital necessário"
    >
      <MonthlyIncomeSimulator />
    </PageWrapper>
  );
}
