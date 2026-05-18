'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoPortfolio, demoWatchlist } from '@/lib/demo-data';
import { isDemoModeClient } from '@/lib/demo-portfolio-storage';
import { loadDemoPortfolio } from '@/lib/demo-portfolio-storage';
import { loadDemoWatchlist } from '@/lib/demo-watchlist-storage';
import type {
  RankingMetric,
  RankingReport,
  RankingScope,
} from '@/lib/asset-ranking';
import { toast } from 'sonner';

export function useRanking(
  scope: RankingScope = 'portfolio',
  metric: RankingMetric = 'return'
) {
  const [report, setReport] = useState<RankingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const demo = isDemoModeClient();
      setIsDemo(demo);

      if (demo) {
        const portfolio = loadDemoPortfolio() ?? demoPortfolio;
        const watchlist = loadDemoWatchlist() ?? demoWatchlist;
        const res = await fetch('/api/ranking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, metric, portfolioItems: portfolio, watchlistItems: watchlist }),
        });
        if (res.ok) setReport(await res.json());
        return;
      }

      const params = new URLSearchParams({ scope, metric });
      const res = await fetch(`/api/ranking?${params}`);
      if (res.ok) setReport(await res.json());
    } catch {
      toast.error('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  }, [scope, metric]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { report, loading, isDemo, refresh: fetchRanking };
}
