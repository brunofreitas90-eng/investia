'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadClientPreferences, saveClientPreferences } from '@/lib/client-local-storage';
import { getClientDataMode, isLocalClientMode } from '@/lib/client-data-mode';
import { mergePreferences } from '@/lib/user-preferences';
import { notifyPreferencesUpdated } from '@/hooks/use-user-preferences';
import type { SettingsPayload, UserPreferences } from '@/types';
import { toast } from 'sonner';

export function useSettings() {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const mode = getClientDataMode();
      setIsDemo(mode === 'demo');

      if (isLocalClientMode()) {
        const prefs = loadClientPreferences();
        const fullName = mode === 'demo' ? 'Visitante Demo' : 'Carteira pessoal';
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preview: true,
            fullName,
            preferences: prefs,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...data, preferences: prefs, fullName });
        }
        return;
      }

      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (input: {
    fullName?: string;
    preferences?: Partial<UserPreferences>;
  }) => {
    setSaving(true);
    try {
      const prefs = mergePreferences({
        ...settings?.preferences,
        ...input.preferences,
      });

      if (isLocalClientMode()) {
        saveClientPreferences(prefs);
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                fullName: input.fullName ?? prev.fullName,
                preferences: prefs,
              }
            : prev
        );
        toast.success('Preferências salvas');
        notifyPreferencesUpdated();
        return;
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: input.fullName,
          preferences: prefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar');
        return;
      }
      setSettings(data);
      toast.success('Configurações salvas');
      notifyPreferencesUpdated();
    } catch {
      toast.error('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    isDemo,
    refresh: fetchSettings,
    saveSettings,
  };
}
