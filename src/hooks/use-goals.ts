'use client';

import { useCallback, useEffect, useState } from 'react';
import { demoFinancialGoal } from '@/lib/demo-data';
import { isDemoModeClient } from '@/lib/demo-portfolio-storage';
import { loadDemoGoal, saveDemoGoal } from '@/lib/demo-goal-storage';
import type { FinancialGoal } from '@/types';
import type { GoalProgressReport } from '@/lib/goal-progress';
import { toast } from 'sonner';

export function useGoals() {
  const [report, setReport] = useState<GoalProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const demo = isDemoModeClient();
      setIsDemo(demo);

      if (demo) {
        const goal = loadDemoGoal() ?? demoFinancialGoal;
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preview: true, goal }),
        });
        if (res.ok) setReport(await res.json());
        return;
      }

      const res = await fetch('/api/goals');
      if (res.ok) setReport(await res.json());
    } catch {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const previewGoal = async (goal: FinancialGoal, currentPatrimony?: number) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preview: true,
        goal,
        currentPatrimony: currentPatrimony ?? report?.currentPatrimony,
      }),
    });
    if (res.ok) setReport(await res.json());
  };

  const saveGoal = async (goal: FinancialGoal) => {
    setSaving(true);
    try {
      if (isDemoModeClient()) {
        saveDemoGoal(goal);
        await previewGoal(goal);
        toast.success('Meta salva (demo)');
        return;
      }

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar');
        return;
      }
      setReport(data);
      toast.success('Meta atualizada');
    } catch {
      toast.error('Falha ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  return {
    report,
    loading,
    saving,
    isDemo,
    refresh: fetchGoals,
    saveGoal,
    previewGoal,
  };
}
