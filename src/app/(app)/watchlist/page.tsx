'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { WatchlistDashboard } from '@/components/watchlist/watchlist-dashboard';

export default function WatchlistPage() {
  return (
    <PageWrapper
      title="Watchlist"
      subtitle="Monitore seus ativos favoritos com cotações ao vivo"
    >
      <WatchlistDashboard />
    </PageWrapper>
  );
}
