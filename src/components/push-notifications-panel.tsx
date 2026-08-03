'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  checkPushSupport,
  disablePushNotifications,
  enablePushNotifications,
  isPushEnabledLocally,
  registerServiceWorker,
  syncPushTickers,
} from '@/lib/push/client';
import { loadClientPortfolio, loadClientWatchlist } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

async function collectMonitoredAssets(): Promise<{
  tickers: string[];
  avgPrices: Record<string, number>;
}> {
  const tickers = new Set<string>();
  const avgPrices: Record<string, number> = {};

  if (isLocalClientMode()) {
    const portfolio = loadClientPortfolio();
    const invested = new Map<string, { qty: number; cost: number }>();
    for (const item of portfolio) {
      const t = item.ticker.toUpperCase();
      tickers.add(t);
      const prev = invested.get(t) ?? { qty: 0, cost: 0 };
      prev.qty += item.quantity;
      prev.cost += item.quantity * item.average_price;
      invested.set(t, prev);
    }
    for (const [t, v] of invested) {
      if (v.qty > 0) avgPrices[t] = v.cost / v.qty;
    }
    for (const w of loadClientWatchlist()) {
      tickers.add(w.ticker.toUpperCase());
    }
    return { tickers: [...tickers], avgPrices };
  }

  try {
    const [pRes, wRes] = await Promise.all([
      fetch('/api/portfolio'),
      fetch('/api/watchlist'),
    ]);
    if (pRes.ok) {
      const data = await pRes.json();
      const items = data.items ?? [];
      const invested = new Map<string, { qty: number; cost: number }>();
      for (const item of items) {
        const t = String(item.ticker).toUpperCase();
        tickers.add(t);
        const prev = invested.get(t) ?? { qty: 0, cost: 0 };
        prev.qty += Number(item.quantity) || 0;
        prev.cost += (Number(item.quantity) || 0) * (Number(item.average_price) || 0);
        invested.set(t, prev);
      }
      for (const [t, v] of invested) {
        if (v.qty > 0) avgPrices[t] = v.cost / v.qty;
      }
    }
    if (wRes.ok) {
      const data = await wRes.json();
      for (const w of data.items ?? []) {
        tickers.add(String(w.ticker).toUpperCase());
      }
    }
  } catch {
    /* ignore */
  }

  return { tickers: [...tickers], avgPrices };
}

export function PushNotificationsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supportMsg, setSupportMsg] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setEnabled(isPushEnabledLocally());
    const support = checkPushSupport();
    if (!support.supported) setSupportMsg(support.reason ?? null);
    registerServiceWorker();

    fetch('/api/push/vapid', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setServerConfigured(Boolean(d.configured)))
      .catch(() => setServerConfigured(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const sync = async () => {
      const { tickers, avgPrices } = await collectMonitoredAssets();
      if (tickers.length) void syncPushTickers(tickers, avgPrices);
    };

    void sync();
    const id = window.setInterval(() => void sync(), 5 * 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const { tickers, avgPrices } = await collectMonitoredAssets();
      if (tickers.length === 0) {
        toast.error('Adicione ativos na carteira ou watchlist antes de ativar.');
        return;
      }
      const result = await enablePushNotifications({ tickers, avgPrices });
      if (!result.ok) {
        toast.error(result.error || 'Não foi possível ativar');
        return;
      }
      setEnabled(true);
      toast.success('Notificações ativadas neste aparelho');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disablePushNotifications();
      setEnabled(false);
      toast.success('Notificações desativadas');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Notificações no celular</p>
            {enabled ? (
              <Badge variant="success">Ativas</Badge>
            ) : (
              <Badge variant="secondary">Desligadas</Badge>
            )}
            {serverConfigured === false && (
              <Badge variant="warning">Servidor pendente</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Avisos mesmo com o app fechado: data COM, pagamentos, anúncios de proventos,
            altas/quedas relevantes e variação vs seu preço médio — da carteira e da
            watchlist.
          </p>
          {supportMsg && (
            <p className="text-xs text-amber-400/90 mt-2">{supportMsg}</p>
          )}
          <p className="text-[11px] text-zinc-600 mt-2">
            No iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início, depois
            ative as notificações aqui.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!enabled ? (
          <Button
            onClick={handleEnable}
            disabled={busy || supportMsg != null}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Ativar no celular
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleDisable}
            disabled={busy}
            className={cn('gap-2')}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            Desativar
          </Button>
        )}
      </div>
    </div>
  );
}
