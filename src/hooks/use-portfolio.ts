'use client';



import { useCallback, useEffect, useState } from 'react';

import {

  clientItemPrefix,

  clientUserId,

  loadClientPortfolio,

  saveClientPortfolio,

} from '@/lib/client-local-storage';

import { getClientDataMode, isLocalClientMode } from '@/lib/client-data-mode';

import type { PortfolioItem, PortfolioSummary } from '@/types';

import { toast } from 'sonner';



export interface AddPortfolioInput {

  ticker: string;

  asset_type: PortfolioItem['asset_type'];

  quantity: number;

  average_price: number;

  purchase_date: string;

  notes?: string;

}



export function usePortfolio() {

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [isDemo, setIsDemo] = useState(false);

  const [saving, setSaving] = useState(false);



  const fetchPortfolio = useCallback(async () => {

    setLoading(true);

    try {

      const mode = getClientDataMode();

      setIsDemo(mode === 'demo');



      if (isLocalClientMode()) {

        const base = loadClientPortfolio();

        const res = await fetch('/api/portfolio', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ items: base }),

        });

        if (res.ok) {

          setSummary(await res.json());

        } else {

          setSummary(null);

        }

        return;

      }



      const res = await fetch('/api/portfolio');

      const data = await res.json();

      if (res.ok) {

        setSummary(data);

      }

    } catch {

      toast.error('Erro ao carregar carteira');

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    fetchPortfolio();

  }, [fetchPortfolio]);



  const addItem = async (input: AddPortfolioInput) => {

    setSaving(true);

    try {

      if (isLocalClientMode()) {

        const stored = loadClientPortfolio();

        const newItem: PortfolioItem = {

          id: `${clientItemPrefix()}-${Date.now()}`,

          user_id: clientUserId(),

          ...input,

          ticker: input.ticker.toUpperCase(),

        };

        const next = [...stored, newItem];

        try {

          saveClientPortfolio(next);

        } catch {

          toast.error(

            'Não foi possível salvar no navegador. Desative bloqueio de cookies/dados do site.'

          );

          return;

        }



        const res = await fetch('/api/portfolio', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ items: next }),

        });

        const data = await res.json();

        if (!res.ok) {

          toast.error('Erro ao atualizar carteira');

          return;

        }

        setSummary(data);

        toast.success(`${input.ticker.toUpperCase()} adicionado!`);

        return;

      }



      const res = await fetch('/api/portfolio', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(input),

      });

      const data = await res.json();

      if (!res.ok) {

        toast.error(data.error || 'Erro ao salvar ativo');

        return;

      }

      toast.success(`${input.ticker.toUpperCase()} adicionado!`);

      await fetchPortfolio();

    } catch {

      toast.error('Falha ao salvar ativo');

    } finally {

      setSaving(false);

    }

  };



  const removeItem = async (id: string) => {

    setSaving(true);

    try {

      if (isLocalClientMode()) {

        const stored = loadClientPortfolio();

        const next = stored.filter((i) => i.id !== id);

        try {

          saveClientPortfolio(next);

        } catch {

          toast.error('Não foi possível salvar no navegador.');

          return;

        }



        const res = await fetch('/api/portfolio', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ items: next }),

        });

        const data = await res.json();

        if (!res.ok) {

          toast.error('Erro ao atualizar carteira');

          return;

        }

        setSummary(data);

        toast.success('Ativo removido');

        return;

      }



      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });

      const data = await res.json();

      if (!res.ok) {

        toast.error(data.error || 'Erro ao remover ativo');

        return;

      }

      toast.success('Ativo removido');

      await fetchPortfolio();

    } catch {

      toast.error('Falha ao remover ativo');

    } finally {

      setSaving(false);

    }

  };



  return {

    items: summary?.items ?? [],

    summary,

    loading,

    saving,

    isDemo,

    refresh: fetchPortfolio,

    addItem,

    removeItem,

  };

}

