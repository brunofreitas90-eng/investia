'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { GoalsDashboard } from '@/components/metas/goals-dashboard';

export default function MetasPage() {
  return (
    <PageWrapper
      title="Metas Financeiras"
      subtitle="Acompanhe seu patrimônio em relação ao objetivo"
    >
      <GoalsDashboard />
    </PageWrapper>
  );
}
