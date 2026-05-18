'use client';

import { Loader2, Coins, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDividends } from '@/hooks/use-dividends';
import { DividendsMonthlyTable } from '@/components/dividendos/dividends-monthly-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  confirmed: 'Confirmado',
  expected: 'Previsto',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  paid: 'success',
  confirmed: 'warning',
  expected: 'secondary',
};

export function DividendsDashboard() {
  const { summary, loading, refresh } = useDividends();

  const upcoming = summary?.events.filter((e) => e.status !== 'paid') ?? [];
  const paid = summary?.events.filter((e) => e.status === 'paid') ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500 flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              Recebidos (12 meses)
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(summary?.received12m ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Renda passiva / mês</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(summary?.monthlyEstimate ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Yield médio da carteira
            </p>
            <p className="text-2xl font-bold mt-1">
              {(summary?.averageYield ?? 0) > 0
                ? `${summary!.averageYield.toFixed(1)}%`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Calculando proventos da carteira...</p>
          </CardContent>
        </Card>
      )}

      {!loading && (summary?.events.length ?? 0) === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-zinc-400">
            Nenhum dividendo encontrado. Adicione ativos na carteira com histórico de
            proventos.
          </CardContent>
        </Card>
      )}

      {!loading && (summary?.monthlyBreakdown?.length ?? 0) > 0 && (
        <DividendsMonthlyTable rows={summary!.monthlyBreakdown} loading={loading} />
      )}

      {!loading && upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-amber-400" />
              Próximos proventos
              <Badge variant="warning">{formatCurrency(summary?.expectedUpcoming ?? 0)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((d) => (
              <DividendRow key={d.id} dividend={d} />
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && paid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-5 w-5 text-emerald-400" />
              Histórico (últimos 12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paid.slice(0, 20).map((d) => (
              <DividendRow key={d.id} dividend={d} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DividendRow({
  dividend: d,
}: {
  dividend: {
    id: string;
    ticker: string;
    amount: number;
    status: string;
    com_date?: string;
    ex_date?: string;
    payment_date?: string;
    amount_per_share?: number;
  };
}) {
  return (
    <div className="p-4 rounded-xl border border-white/[0.06] hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div>
          <span className="font-bold">{d.ticker}</span>
          {d.amount_per_share != null && (
            <span className="text-xs text-zinc-500 ml-2">
              R$ {d.amount_per_share.toFixed(4)}/ação
            </span>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[d.status] ?? 'secondary'}>
          {STATUS_LABELS[d.status] ?? d.status}
        </Badge>
      </div>
      <p className="text-emerald-400 font-semibold mt-1">{formatCurrency(d.amount)}</p>
      <p className="text-sm text-zinc-500 mt-2">
        {d.com_date && <>COM {formatDate(d.com_date)} · </>}
        {d.ex_date && <>EX {formatDate(d.ex_date)} · </>}
        {d.payment_date && <>Pgto {formatDate(d.payment_date)}</>}
      </p>
    </div>
  );
}
