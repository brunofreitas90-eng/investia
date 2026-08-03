'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { RadarDashboard } from '@/components/radar/radar-dashboard';
import { MarketDropsPanel } from '@/components/radar/market-drops-panel';

export default function RadarPage() {
  return (
    <PageWrapper
      title="Oportunidades do Mercado"
      subtitle="Maiores quedas investigadas pela IA e radar de ativos promissores"
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Detector de quedas</h2>
          <MarketDropsPanel />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Radar de oportunidades</h2>
          <RadarDashboard />
        </section>
      </div>
    </PageWrapper>
  );
}
