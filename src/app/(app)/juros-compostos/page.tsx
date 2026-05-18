'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { CompoundInterestCalculator } from '@/components/calculators/compound-interest-calculator';

export default function JurosCompostosPage() {
  return (
    <PageWrapper
      title="Juros Compostos"
      subtitle="Simule quanto seu dinheiro pode render ao longo do tempo"
    >
      <CompoundInterestCalculator />
    </PageWrapper>
  );
}
