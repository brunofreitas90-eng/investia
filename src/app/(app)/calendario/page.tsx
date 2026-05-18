'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { CalendarDashboard } from '@/components/calendario/calendar-dashboard';

export default function CalendarioPage() {
  return (
    <PageWrapper
      title="Calendário Financeiro"
      subtitle="Datas COM, ex-dividendo e pagamentos da sua carteira"
    >
      <CalendarDashboard />
    </PageWrapper>
  );
}
