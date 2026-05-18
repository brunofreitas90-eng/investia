'use client';

import { useCallback, useEffect, useState } from 'react';
import { isDemoModeClient } from '@/lib/demo-portfolio-storage';
import {
  loadDemoPreferences,
  saveDemoPreferences,
} from '@/lib/demo-preferences-storage';
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
      const demo = isDemoModeClient();
      setIsDemo(demo);

      if (demo) {
        const prefs = loadDemoPreferences();
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preview: true,
            fullName: 'Visitante Demo',
            preferences: prefs,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...data, preferences: prefs });
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

      if (isDemoModeClient()) {
        saveDemoPreferences(prefs);
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                fullName: input.fullName ?? prev.fullName,
                preferences: prefs,
              }
            : prev
        );
        toast.success('Preferências salvas (demo)');
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
      toast.success('Configurações atualizadas');
      notifyPreferencesUpdated();
    } catch {
      toast.error('Falha ao salvar');
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
