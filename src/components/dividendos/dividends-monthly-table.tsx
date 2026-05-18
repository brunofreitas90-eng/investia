'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyDividendRow } from '@/lib/dividends-monthly';
import { Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DividendsMonthlyTable({
  rows,
  loading,
}: {
  rows: MonthlyDividendRow[];
  loading?: boolean;
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      received: acc.received + r.received,
      expected: acc.expected + r.expected,
      total: acc.total + r.total,
    }),
    { received: 0, expected: 0, total: 0 }
  );

  const hasData = rows.some((r) => r.received > 0 || r.expected > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Table2 className="h-5 w-5 text-emerald-400" />
          Rendimentos mês a mês
        </CardTitle>
        <p className="text-xs text-zinc-500 mt-1">
          Recebidos (pagos) e previstos por mês de pagamento
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-zinc-500 py-8 text-center">Carregando...</p>
        ) : !hasData ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Sem proventos no período. Adicione ativos na carteira.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-500">
                <th className="text-left py-3 pr-4 font-medium">Mês</th>
                <th className="text-right py-3 px-3 font-medium">Recebidos</th>
                <th className="text-right py-3 px-3 font-medium">Previstos</th>
                <th className="text-right py-3 pl-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCurrent =
                  row.monthKey ===
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const isEmpty = row.received === 0 && row.expected === 0;

                return (
                  <tr
                    key={row.monthKey}
                    className={cn(
                      'border-b border-white/[0.04] transition-colors',
                      isCurrent && 'bg-emerald-500/5',
                      isEmpty && 'opacity-40'
                    )}
                  >
                    <td className="py-3 pr-4 font-medium text-zinc-200">
                      {row.label}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-emerald-400">atual</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">
                      {row.received > 0 ? formatCurrency(row.received) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400 tabular-nums">
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
              <tr className="border-t border-white/[0.1] font-semibold">
                <td className="py-3 pr-4 text-zinc-300">Total no período</td>
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
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
