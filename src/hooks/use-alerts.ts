'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clientItemPrefix,
  clientUserId,
  loadClientAlerts,
  loadClientPortfolio,
  loadClientPreferences,
  saveClientAlerts,
} from '@/lib/client-local-storage';
import { getClientDataMode, isLocalClientMode } from '@/lib/client-data-mode';
import { buildCondition } from '@/lib/alert-config';
import { mergePreferences } from '@/lib/user-preferences';
import type { Alert, AlertType } from '@/types';
import type { AlertWithStatus } from '@/services/alerts/evaluate';
import { toast } from 'sonner';

export interface AddAlertInput {
  ticker: string;
  alert_type: AlertType;
  targetPrice?: number;
  percent?: number;
  daysBefore?: number;
  notify_email?: boolean;
  notify_app?: boolean;
}

interface AlertsResponse {
  alerts: AlertWithStatus[];
  triggeredCount: number;
  total: number;
}

export function useAlerts() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      setIsDemo(getClientDataMode() === 'demo');

      if (isLocalClientMode()) {
        const base = loadClientAlerts();
        const portfolioItems = loadClientPortfolio();
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts: base, portfolioItems }),
        });
        if (res.ok) setData(await res.json());
        return;
      }

      const res = await fetch('/api/alerts');
      if (res.ok) setData(await res.json());
    } catch {
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const persistLocal = async (alerts: Alert[]) => {
    saveClientAlerts(alerts);
    const portfolioItems = loadClientPortfolio();
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts, portfolioItems }),
    });
    if (res.ok) setData(await res.json());
  };

  const resolveNotifyDefaults = async () => {
    if (isLocalClientMode()) {
      const p = loadClientPreferences();
      return { email: p.notifyEmail, app: p.notifyApp };
    }
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const p = mergePreferences(data.preferences);
        return { email: p.notifyEmail, app: p.notifyApp };
      }
    } catch {
      /* use defaults */
    }
    return { email: true, app: true };
  };

  const addAlert = async (input: AddAlertInput) => {
    const ticker = input.ticker.toUpperCase().trim();
    if (!ticker) return;

    setSaving(true);
    try {
      const notifyDefaults = await resolveNotifyDefaults();
      const condition = buildCondition(input.alert_type, {
        targetPrice: input.targetPrice,
        percent: input.percent,
        daysBefore: input.daysBefore,
      });

      if (isLocalClientMode()) {
        const stored = loadClientAlerts();
        const newAlert: Alert = {
          id: `${clientItemPrefix()}-al-${Date.now()}`,
          user_id: clientUserId(),
          ticker,
          alert_type: input.alert_type,
          condition,
          is_active: true,
          notify_email: input.notify_email ?? notifyDefaults.email,
          notify_app: input.notify_app ?? notifyDefaults.app,
        };
        await persistLocal([...stored, newAlert]);
        toast.success('Alerta criado');
        return;
      }

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          alert_type: input.alert_type,
          targetPrice: input.targetPrice,
          percent: input.percent,
          daysBefore: input.daysBefore,
          notify_email: input.notify_email ?? notifyDefaults.email,
          notify_app: input.notify_app ?? notifyDefaults.app,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao criar alerta');
        return;
      }
      setData(json);
      toast.success('Alerta criado');
    } catch {
      toast.error('Falha ao criar alerta');
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    setSaving(true);
    try {
      if (isLocalClientMode()) {
        const stored = loadClientAlerts();
        const next = stored.map((a) => (a.id === id ? { ...a, is_active: isActive } : a));
        await persistLocal(next);
        return;
      }

      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: isActive }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      toast.error('Falha ao atualizar alerta');
    } finally {
      setSaving(false);
    }
  };

  const removeAlert = async (id: string) => {
    setSaving(true);
    try {
      if (isLocalClientMode()) {
        const stored = loadClientAlerts();
        await persistLocal(stored.filter((a) => a.id !== id));
        toast.success('Alerta removido');
        return;
      }

      const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao remover');
        return;
      }
      setData(json);
      toast.success('Alerta removido');
    } catch {
      toast.error('Falha ao remover alerta');
    } finally {
      setSaving(false);
    }
  };

  return {
    alerts: data?.alerts ?? [],
    triggeredCount: data?.triggeredCount ?? 0,
    total: data?.total ?? 0,
    loading,
    saving,
    isDemo,
    refresh: fetchAlerts,
    addAlert,
    toggleAlert,
    removeAlert,
  };
}
