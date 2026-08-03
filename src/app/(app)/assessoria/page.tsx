'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { AiStatusBanner } from '@/components/ai-status-banner';
import { InvestmentAdvisorPanel } from '@/components/assessoria/investment-advisor-panel';

export default function AssessoriaPage() {
  return (
    <PageWrapper
      title="Assessor IA"
      subtitle="Recomendações de compra e venda alinhadas à sua estratégia de renda passiva"
    >
      <div className="space-y-4">
        <AiStatusBanner />
        <InvestmentAdvisorPanel />
      </div>
    </PageWrapper>
  );
}
