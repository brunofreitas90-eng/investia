'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoPortfolio } from '@/lib/demo-data';
import { isDemoModeClient, loadDemoPortfolio } from '@/lib/demo-portfolio-storage';
import type { FinancialEvent } from '@/types';
import { toast } from 'sonner';

export interface CalendarData {
  events: FinancialEvent[];
  allEvents: FinancialEvent[];
  dividendsSummary: { received12m: number; expectedUpcoming: number };
}

export function useCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoModeClient()) {
        const stored = loadDemoPortfolio();
        const items = stored?.length ? stored : demoPortfolio;
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (res.ok) setData(await res.json());
        return;
      }

      const res = await fetch('/api/calendar');
      if (res.ok) setData(await res.json());
    } catch {
      toast.error('Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return { data, loading, refresh: fetchCalendar };
}
