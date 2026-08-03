'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadClientPortfolio } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import type { CalendarEventFilter, FinancialEvent } from '@/types';
import { toast } from 'sonner';

export interface CalendarData {
  events: FinancialEvent[];
  allEvents: FinancialEvent[];
  dividendsSummary: { received12m: number; expectedUpcoming: number };
}

export function useCalendar(eventFilter: CalendarEventFilter = 'all', ticker?: string) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter: eventFilter });
      if (ticker) params.set('ticker', ticker);

      if (isLocalClientMode()) {
        const items = loadClientPortfolio();
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, filter: eventFilter, ticker }),
        });
        if (res.ok) setData(await res.json());
        return;
      }

      const res = await fetch(`/api/calendar?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      toast.error('Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  }, [eventFilter, ticker]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return { data, loading, refresh: fetchCalendar };
}
