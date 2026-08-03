'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { CalendarDashboard } from '@/components/calendario/calendar-dashboard';

export default function CalendarioPage() {
  return (
    <PageWrapper
      title="Calendário Financeiro"
      subtitle="Datas COM, EX, pagamentos e filtros por tipo de ativo"
    >
      <CalendarDashboard />
    </PageWrapper>
  );
}
