'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  RefreshCw,
  Trophy,
  Building2,
  Zap,
  Droplets,
  Landmark,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dyClass } from '@/lib/pnl-style';
import type { CoreSector } from '@/lib/investment-strategy';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { SectorDividendRankReport } from '@/services/ranking/sector-dividend-rank';
import { toast } from 'sonner';

const SECTOR_META: Record<
  CoreSector,
  { icon: typeof Landmark; accent: string }
> = {
  Bancos: { icon: Landmark, accent: 'text-sky-400' },
  Seguradoras: { icon: Shield, accent: 'text-violet-400' },
  Energia: { icon: Zap, accent: 'text-amber-400' },
  Saneamento: { icon: Droplets, accent: 'text-cyan-400' },
};

export function SectorDividendRankPanel() {
  const [report, setReport] = useState<SectorDividendRankReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sectors/dividend-rank', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao carregar ranking');
        return;
      }
      setReport(data);
    } catch {
      toast.error('Falha na conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Ranking por setor do núcleo: quem mais paga dividendos em relação ao{' '}
            <span className="text-zinc-200">preço atual</span> (proventos dos
            últimos 12 meses ÷ cotação).
          </p>
          {report?.dataSources && (
            <p className="text-[11px] text-zinc-600 mt-1">
              Fontes: {report.dataSources.join(' · ')}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {loading && !report && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Consultando cotações e dividendos...</p>
          </CardContent>
        </Card>
      )}

      {report?.groups.map((group) => {
        const meta = SECTOR_META[group.sector];
        const Icon = meta?.icon ?? Building2;
        return (
          <Card key={group.sector}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className={cn('h-5 w-5', meta?.accent ?? 'text-emerald-400')} />
                {group.sector}
                <Badge variant="secondary" className="ml-1">
                  {group.items.length} ações
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {group.items.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-zinc-500">
                  Sem dados disponíveis neste momento.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-white/10 bg-white/[0.02] text-zinc-500 text-left">
                        <th className="py-2.5 px-4 font-medium w-12">#</th>
                        <th className="py-2.5 px-4 font-medium">Ativo</th>
                        <th className="py-2.5 px-4 font-medium text-right">Preço</th>
                        <th className="py-2.5 px-4 font-medium text-right">Dia</th>
                        <th className="py-2.5 px-4 font-medium text-right">
                          Dividendos
                          <span className="block text-[10px] font-normal text-zinc-600">
                            % s/ preço atual
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr
                          key={item.ticker}
                          className="border-b border-white/5 hover:bg-white/[0.03]"
                        >
                          <td className="py-3 px-4">
                            {item.rank === 1 ? (
                              <Trophy className="h-4 w-4 text-amber-400" />
                            ) : (
                              <span className="text-zinc-500 tabular-nums">
                                {item.rank}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/analise?ticker=${item.ticker}`}
                              className="font-bold text-white hover:text-emerald-400"
                            >
                              {item.ticker}
                            </Link>
                            <span className="block text-[11px] text-zinc-500">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-zinc-200">
                            {formatCurrency(item.price)}
                          </td>
                          <td
                            className={cn(
                              'py-3 px-4 text-right tabular-nums text-sm',
                              (item.changePercent ?? 0) >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            )}
                          >
                            {item.changePercent != null
                              ? formatPercent(item.changePercent)
                              : '—'}
                          </td>
                          <td
                            className={cn(
                              'py-3 px-4 text-right tabular-nums font-semibold text-base',
                              dyClass(item.dividendYield12m)
                            )}
                          >
                            {item.dividendYield12m != null && item.dividendYield12m > 0
                              ? `${item.dividendYield12m.toFixed(1)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
