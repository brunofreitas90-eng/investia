'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadClientPreferences } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import { mergePreferences } from '@/lib/user-preferences';
import type { UserPreferences } from '@/types';

export const PREFERENCES_UPDATED_EVENT = 'investia-preferences-updated';

export function notifyPreferencesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PREFERENCES_UPDATED_EVENT));
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(mergePreferences());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      if (isLocalClientMode()) {
        setPreferences(loadClientPreferences());
        return;
      }

      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setPreferences(mergePreferences(data.preferences));
      }
    } catch {
      setPreferences(mergePreferences());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener(PREFERENCES_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(PREFERENCES_UPDATED_EVENT, onUpdate);
  }, [reload]);

  return { preferences, loading, reload };
}
