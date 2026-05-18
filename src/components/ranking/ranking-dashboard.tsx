'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  TrendingDown,
  TrendingUp,
  Loader2,
  RefreshCw,
  BarChart3,
  Medal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRanking } from '@/hooks/use-ranking';
import {
  RANKING_METRIC_LABELS,
  RANKING_SCOPE_LABELS,
  type RankingMetric,
  type RankingScope,
} from '@/lib/asset-ranking';
import { formatPercent, cn } from '@/lib/utils';

const SCOPES: RankingScope[] = ['portfolio', 'watchlist', 'market'];
const METRICS: RankingMetric[] = ['return', 'dividend', 'value', 'day_change'];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Medal className="h-5 w-5 text-amber-400" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-zinc-300" />;
  }
  if (rank === 3) {
    return <Medal className="h-5 w-5 text-amber-700" />;
  }
  return (
    <span className="w-5 text-center text-sm font-bold text-zinc-500">{rank}</span>
  );
}

export function RankingDashboard() {
  const [scope, setScope] = useState<RankingScope>('portfolio');
  const [metric, setMetric] = useState<RankingMetric>('return');
  const { report, loading, isDemo, refresh } = useRanking(scope, metric);

  const items = report?.items ?? [];
  const best = report?.summary.best;
  const worst = report?.summary.worst;

  return (
    <div className="space-y-6 max-w-5xl">
      {isDemo && (
        <p className="text-xs text-zinc-500">
          Modo demo — ranking com dados da carteira e watchlist do navegador.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Universo</p>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    scope === s
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'border-white/10 text-zinc-400 hover:border-white/20'
                  )}
                >
                  {RANKING_SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Ordenar por</p>
            <div className="flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    metric === m
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'border-white/10 text-zinc-400 hover:border-white/20'
                  )}
                >
                  {RANKING_METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && report && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Melhor</p>
                <p className="font-bold">{best?.ticker ?? '—'}</p>
                <p className="text-sm text-emerald-400">{best?.metricFormatted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Pior</p>
                <p className="font-bold">{worst?.ticker ?? '—'}</p>
                <p className="text-sm text-red-400">{worst?.metricFormatted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500">Média ({items.length} ativos)</p>
              <p className="text-lg font-bold mt-1">
                {metric === 'value'
                  ? report.summary.averageMetric.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })
                  : formatPercent(report.summary.averageMetric)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Calculando ranking...</p>
          </CardContent>
        </Card>
      )}

      {!loading && items.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-zinc-400">
            Nenhum ativo para ranquear neste universo. Adicione posições na carteira ou
            tickers na watchlist.
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {RANKING_SCOPE_LABELS[scope]} — {RANKING_METRIC_LABELS[metric]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => {
              const positive = item.metricValue >= 0;
              return (
                <div
                  key={item.ticker}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-white/[0.06]',
                    item.rank <= 3 && 'bg-emerald-500/[0.03] border-emerald-500/10'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RankBadge rank={item.rank} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{item.ticker}</span>
                        {item.asset_type && (
                          <Badge variant="secondary">{item.asset_type}</Badge>
                        )}
                        {item.inPortfolio && scope !== 'portfolio' && (
                          <Badge variant="success">Na carteira</Badge>
                        )}
                      </div>
                      {item.name && (
                        <p className="text-xs text-zinc-500 truncate">{item.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        positive ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {item.metricFormatted}
                    </p>
                    {item.secondaryValue && (
                      <p className="text-xs text-zinc-500">
                        {item.secondaryLabel}: {item.secondaryValue}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/analise?ticker=${item.ticker}`}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                      Analisar
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
