'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoOperations } from '@/lib/demo-data';
import { isDemoModeClient } from '@/lib/demo-portfolio-storage';
import {
  loadDemoOperations,
  saveDemoOperations,
} from '@/lib/demo-operations-storage';
import type { TaxReport } from '@/lib/ir-tax';
import type { Operation, OperationType } from '@/types';
import { toast } from 'sonner';

export interface AddOperationInput {
  ticker: string;
  operation_type: OperationType;
  quantity: number;
  price: number;
  fees?: number;
  operation_date: string;
  market?: 'B3' | 'NYSE' | 'NASDAQ';
}

export function useTax(year?: number) {
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const selectedYear = year ?? new Date().getFullYear();

  const fetchTax = useCallback(async () => {
    setLoading(true);
    try {
      const demo = isDemoModeClient();
      setIsDemo(demo);

      if (demo) {
        const stored = loadDemoOperations();
        const ops = stored?.length ? stored : demoOperations;
        const res = await fetch('/api/tax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: ops, year: selectedYear }),
        });
        if (res.ok) setReport(await res.json());
        return;
      }

      const res = await fetch(`/api/tax?year=${selectedYear}`);
      if (res.ok) setReport(await res.json());
    } catch {
      toast.error('Erro ao carregar imposto de renda');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchTax();
  }, [fetchTax]);

  const persistDemo = async (ops: Operation[]) => {
    saveDemoOperations(ops);
    const res = await fetch('/api/tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations: ops, year: selectedYear }),
    });
    if (res.ok) setReport(await res.json());
  };

  const addOperation = async (input: AddOperationInput) => {
    setSaving(true);
    try {
      if (isDemoModeClient()) {
        const stored = loadDemoOperations() ?? demoOperations;
        const newOp: Operation = {
          id: `demo-op-${Date.now()}`,
          user_id: 'demo',
          ticker: input.ticker.toUpperCase(),
          operation_type: input.operation_type,
          quantity: input.quantity,
          price: input.price,
          total: input.quantity * input.price,
          fees: input.fees ?? 0,
          operation_date: input.operation_date,
          market: input.market ?? 'B3',
        };
        await persistDemo([...stored, newOp]);
        toast.success('Operação registrada');
        return;
      }

      const res = await fetch('/api/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, year: selectedYear }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao registrar');
        return;
      }
      setReport(data);
      toast.success('Operação registrada');
    } catch {
      toast.error('Falha ao registrar operação');
    } finally {
      setSaving(false);
    }
  };

  const removeOperation = async (id: string) => {
    setSaving(true);
    try {
      if (isDemoModeClient()) {
        const stored = loadDemoOperations() ?? demoOperations;
        await persistDemo(stored.filter((o) => o.id !== id));
        toast.success('Operação removida');
        return;
      }

      const res = await fetch(`/api/tax?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao remover');
        return;
      }
      setReport(data);
      toast.success('Operação removida');
    } catch {
      toast.error('Falha ao remover');
    } finally {
      setSaving(false);
    }
  };

  return {
    report,
    loading,
    saving,
    isDemo,
    refresh: fetchTax,
    addOperation,
    removeOperation,
  };
}
