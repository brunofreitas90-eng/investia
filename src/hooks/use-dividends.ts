'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoPortfolio } from '@/lib/demo-data';
import { isDemoModeClient } from '@/lib/demo-portfolio-storage';
import { loadDemoPortfolio } from '@/lib/demo-portfolio-storage';
import type { DividendsSummary } from '@/services/dividends/portfolio-dividends';
import { toast } from 'sonner';

export function useDividends() {
  const [summary, setSummary] = useState<DividendsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDividends = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoModeClient()) {
        const stored = loadDemoPortfolio();
        const items = stored?.length ? stored : demoPortfolio;
        const res = await fetch('/api/dividends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (res.ok) setSummary(await res.json());
        return;
      }

      const res = await fetch('/api/dividends');
      if (res.ok) setSummary(await res.json());
    } catch {
      toast.error('Erro ao carregar dividendos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDividends();
  }, [fetchDividends]);

  return { summary, loading, refresh: fetchDividends };
}
