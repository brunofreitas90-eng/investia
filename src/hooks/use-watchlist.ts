'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clientItemPrefix,
  clientUserId,
  loadClientWatchlist,
  saveClientWatchlist,
} from '@/lib/client-local-storage';
import { getClientDataMode, isLocalClientMode } from '@/lib/client-data-mode';
import type { AssetType, WatchlistItem } from '@/types';
import { toast } from 'sonner';

export interface AddWatchlistInput {
  ticker: string;
  asset_type: AssetType;
  notes?: string;
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      setIsDemo(getClientDataMode() === 'demo');

      if (isLocalClientMode()) {
        const base = loadClientWatchlist();
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: base }),
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
        return;
      }

      const res = await fetch('/api/watchlist');
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
    } catch {
      toast.error('Erro ao carregar watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addItem = async (input: AddWatchlistInput) => {
    const ticker = input.ticker.toUpperCase().trim();
    if (!ticker) return;

    if (items.some((i) => i.ticker === ticker)) {
      toast.error(`${ticker} já está na watchlist`);
      return;
    }

    setSaving(true);
    try {
      if (isLocalClientMode()) {
        const stored = loadClientWatchlist();
        const newItem: WatchlistItem = {
          id: `${clientItemPrefix()}-w-${Date.now()}`,
          user_id: clientUserId(),
          ticker,
          asset_type: input.asset_type,
          notes: input.notes,
        };
        const next = [...stored, newItem];
        saveClientWatchlist(next);

        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: next }),
        });
        const data = await res.json();
        if (res.ok) {
          setItems(data.items ?? []);
          toast.success(`${ticker} adicionado à watchlist`);
        }
        return;
      }

      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao adicionar');
        return;
      }
      setItems(data.items ?? []);
      toast.success(`${ticker} adicionado à watchlist`);
    } catch {
      toast.error('Falha ao adicionar ativo');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    setSaving(true);
    try {
      if (isLocalClientMode()) {
        const stored = loadClientWatchlist();
        const next = stored.filter((i) => i.id !== id);
        saveClientWatchlist(next);

        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: next }),
        });
        const data = await res.json();
        if (res.ok) {
          setItems(data.items ?? []);
          toast.success('Removido da watchlist');
        }
        return;
      }

      const res = await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao remover');
        return;
      }
      setItems(data.items ?? []);
      toast.success('Removido da watchlist');
    } catch {
      toast.error('Falha ao remover ativo');
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    loading,
    saving,
    isDemo,
    refresh: fetchWatchlist,
    addItem,
    removeItem,
  };
}
