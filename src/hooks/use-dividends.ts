'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadClientPortfolio } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import type { DividendsSummary } from '@/services/dividends/portfolio-dividends';
import { toast } from 'sonner';

export function useDividends() {
  const [summary, setSummary] = useState<DividendsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDividends = useCallback(async () => {
    setLoading(true);
    try {
      if (isLocalClientMode()) {
        const items = loadClientPortfolio();
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
