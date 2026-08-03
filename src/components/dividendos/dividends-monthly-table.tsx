'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  computeYearSummaries,
  filterRowsByYear,
  type MonthlyDividendRow,
} from '@/lib/dividends-monthly';
import { pnlText } from '@/lib/pnl-style';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DividendsMonthlyTable({
  rows,
  loading,
}: {
  rows: MonthlyDividendRow[];
  loading?: boolean;
}) {
  const years = useMemo(() => {
    const set = new Set(rows.map((r) => parseInt(r.monthKey.split('-')[0], 10)));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const [selectedYear, setSelectedYear] = useState<number>(
    () => new Date().getFullYear()
  );

  const effectiveYear = years.includes(selectedYear) ? selectedYear : years[0] ?? selectedYear;
  const yearRows = useMemo(
    () => filterRowsByYear(rows, effectiveYear),
    [rows, effectiveYear]
  );
  const yearSummary = useMemo(
    () => computeYearSummaries(rows).find((y) => y.year === effectiveYear),
    [rows, effectiveYear]
  );

  const totals = yearRows.reduce(
    (acc, r) => ({
      received: acc.received + r.received,
      expected: acc.expected + r.expected,
      total: acc.total + r.total,
    }),
    { received: 0, expected: 0, total: 0 }
  );

  const hasData = yearRows.some((r) => r.received > 0 || r.expected > 0);
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-5 w-5 text-emerald-400" />
              Proventos por mês — {effectiveYear}
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-1">
              Verde = já recebido · Amarelo = previsto · Médias calculadas no ano selecionado
            </p>
          </div>
          {years.length > 1 && (
            <div className="flex gap-1">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium',
                    effectiveYear === y
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {yearSummary && hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> Média mensal recebida
              </p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {formatCurrency(yearSummary.avgReceivedPerMonth)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Total no ano: {formatCurrency(yearSummary.totalReceived)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-zinc-500">Média mensal prevista</p>
              <p className="text-xl font-bold text-amber-400 mt-1">
                {formatCurrency(yearSummary.avgExpectedPerMonth)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Total previsto: {formatCurrency(yearSummary.totalExpected)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-zinc-500">Média mensal total</p>
              <p className="text-xl font-bold text-white mt-1">
                {formatCurrency(yearSummary.avgTotalPerMonth)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Recebidos + previstos: {formatCurrency(yearSummary.totalCombined)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-zinc-500 py-8 text-center">Carregando...</p>
          ) : !hasData ? (
            <p className="text-sm text-zinc-500 py-8 text-center">
              Sem proventos em {effectiveYear}. Adicione ativos na carteira.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-zinc-500">
                  <th className="text-left py-3 pr-4 font-medium">Mês</th>
                  <th className="text-right py-3 px-3 font-medium text-emerald-400/80">
                    Recebidos
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-amber-400/80">
                    Previstos
                  </th>
                  <th className="text-right py-3 pl-3 font-medium">Total do mês</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((row) => {
                  const isCurrent = row.monthKey === currentMonthKey;
                  const isEmpty = row.received === 0 && row.expected === 0;

                  return (
                    <tr
                      key={row.monthKey}
                      className={cn(
                        'border-b border-white/[0.04] transition-colors',
                        isCurrent && 'bg-emerald-500/5',
                        isEmpty && 'opacity-35'
                      )}
                    >
                      <td className="py-3 pr-4 font-medium text-zinc-200">
                        {row.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-emerald-400">mês atual</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 tabular-nums font-medium">
                        {row.received > 0 ? formatCurrency(row.received) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-400 tabular-nums font-medium">
                        {row.expected > 0 ? formatCurrency(row.expected) : '—'}
                      </td>
                      <td className="py-3 pl-3 text-right font-semibold text-white tabular-nums">
                        {row.total > 0 ? formatCurrency(row.total) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.12] font-semibold bg-white/[0.02]">
                  <td className="py-3 pr-4 text-zinc-200">Total em {effectiveYear}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">
                    {formatCurrency(totals.received)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400 tabular-nums">
                    {formatCurrency(totals.expected)}
                  </td>
                  <td className="py-3 pl-3 text-right text-white tabular-nums">
                    {formatCurrency(totals.total)}
                  </td>
                </tr>
                {yearSummary && (
                  <tr className="border-t border-dashed border-white/[0.08] text-sm">
                    <td className="py-3 pr-4 text-zinc-400">Média mensal do ano</td>
                    <td className={cn('py-3 px-3 text-right tabular-nums', pnlText(1))}>
                      {formatCurrency(yearSummary.avgReceivedPerMonth)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400/90 tabular-nums">
                      {formatCurrency(yearSummary.avgExpectedPerMonth)}
                    </td>
                    <td className="py-3 pl-3 text-right text-zinc-200 tabular-nums font-medium">
                      {formatCurrency(yearSummary.avgTotalPerMonth)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
