'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { RadarDashboard } from '@/components/radar/radar-dashboard';

export default function RadarPage() {
  return (
    <PageWrapper
      title="Radar de Oportunidades"
      subtitle="Ativos descontados, em alta e com bons dividendos"
    >
      <RadarDashboard />
    </PageWrapper>
  );
}
