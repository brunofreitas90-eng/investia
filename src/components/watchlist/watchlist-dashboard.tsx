'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWatchlist } from '@/hooks/use-watchlist';
import { popularTickers } from '@/lib/demo-data';
import { dyClass } from '@/lib/pnl-style';
import { formatCurrency, formatPercent, isBrazilianTicker, cn } from '@/lib/utils';
import type { AssetType } from '@/types';

function inferAssetType(ticker: string): AssetType {
  const t = ticker.toUpperCase();
  if (/^[A-Z]{1,5}$/.test(t) && !isBrazilianTicker(t)) return 'stock_us';
  if (t.endsWith('11')) return 'fii';
  return 'stock_br';
}

export function WatchlistDashboard() {
  const { items, loading, saving, isDemo, refresh, addItem, removeItem } =
    useWatchlist();
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock_br');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = ticker.toUpperCase().trim();
    if (!symbol) return;
    await addItem({
      ticker: symbol,
      asset_type: assetType,
      notes: notes.trim() || undefined,
    });
    setTicker('');
    setNotes('');
    setAssetType(inferAssetType(symbol));
  };

  const quickAdd = async (t: string) => {
    await addItem({
      ticker: t,
      asset_type: inferAssetType(t),
    });
  };

  const gainers = items.filter((i) => (i.change_percent ?? 0) > 0).length;
  const losers = items.filter((i) => (i.change_percent ?? 0) < 0).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Ativos monitorados</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Em alta hoje</p>
              <p className="text-2xl font-bold text-emerald-400">{gainers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-xs text-zinc-500">Em queda hoje</p>
              <p className="text-2xl font-bold text-red-400">{losers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-emerald-400" />
            Adicionar à watchlist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDemo && (
            <p className="text-xs text-zinc-500">
              Modo demo — favoritos salvos no navegador.
            </p>
          )}
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <Label>Ticker</Label>
              <Input
                value={ticker}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setTicker(v);
                  if (v) setAssetType(inferAssetType(v));
                }}
                placeholder="PETR4, AAPL..."
                required
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
              >
                <option value="stock_br">Ação BR</option>
                <option value="stock_us">Ação US</option>
                <option value="fii">FII</option>
                <option value="etf">ETF</option>
                <option value="bdr">BDR</option>
              </select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: acompanhar resultados Q2"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {popularTickers.slice(0, 8).map((t) => (
              <button
                key={t}
                type="button"
                disabled={saving || items.some((i) => i.ticker === t)}
                onClick={() => quickAdd(t)}
                className="px-3 py-1 text-xs rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
              >
                + {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="ml-2">Atualizar cotações</span>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Carregando cotações...</p>
          </CardContent>
        </Card>
      )}

      {!loading && items.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-zinc-400">
            Nenhum ativo na watchlist. Adicione tickers para monitorar.
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((item) => {
            const change = item.change_percent ?? 0;
            const currency = isBrazilianTicker(item.ticker) ? 'BRL' : 'USD';

            return (
              <Card key={item.id} className="hover:border-emerald-500/20 transition-colors">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400/30" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold">{item.ticker}</span>
                        <Badge variant="secondary">{item.asset_type}</Badge>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-zinc-500 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {item.current_price != null ? (
                      <>
                        <p className="font-semibold text-lg">
                          {formatCurrency(item.current_price, currency)}
                        </p>
                        <p
                          className={cn(
                            'text-sm font-medium',
                            change >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {formatPercent(change)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">Cotação indisponível</p>
                    )}
                  </div>

                  <div className="text-right min-w-[5.5rem]">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Dividendos
                    </p>
                    {item.dividend_yield_12m != null && item.dividend_yield_12m > 0 ? (
                      <p
                        className={cn(
                          'text-base font-semibold tabular-nums',
                          dyClass(item.dividend_yield_12m)
                        )}
                      >
                        {item.dividend_yield_12m.toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-600">—</p>
                    )}
                    <p className="text-[10px] text-zinc-600">s/ preço atual</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/analise?ticker=${item.ticker}`}>
                        <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                        Analisar
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={saving}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-zinc-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
