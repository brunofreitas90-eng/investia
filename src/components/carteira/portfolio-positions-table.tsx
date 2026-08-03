'use client';

import { Badge } from '@/components/ui/badge';
import {
  ASSET_TYPE_LABELS,
  type AggregatedPosition,
} from '@/lib/portfolio-aggregate';
import {
  dyClass,
  pnlPillClass,
  pnlRowAccent,
  pnlText,
  priceVsAverageClass,
} from '@/lib/pnl-style';
import { classifyTickerBucket } from '@/lib/investment-strategy';
import { formatCurrency, formatDate, formatPercent, cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

type Props = {
  positions: AggregatedPosition[];
};

function ResultIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (value < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-zinc-500" />;
}

export function PortfolioPositionsTable({ positions }: Props) {
  if (positions.length === 0) return null;

  const totals = positions.reduce(
    (acc, p) => ({
      invested: acc.invested + p.totalInvested,
      value: acc.value + p.currentValue,
      pl: acc.pl + p.profitLoss,
      weightedDy: acc.weightedDy + (p.dividendYieldOnCost ?? 0) * p.totalInvested,
    }),
    { invested: 0, value: 0, pl: 0, weightedDy: 0 }
  );
  const totalPct =
    totals.invested > 0 ? ((totals.value - totals.invested) / totals.invested) * 100 : 0;
  const avgDyOnCost =
    totals.invested > 0 ? totals.weightedDy / totals.invested : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Positivo (lucro / acima do preço médio)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Negativo (prejuízo / abaixo do preço médio)
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-500 text-left">
                <th className="py-3 px-4 font-medium">Ativo</th>
                <th className="py-3 px-4 font-medium">Tipo</th>
                <th className="py-3 px-4 font-medium text-right">Qtd</th>
                <th className="py-3 px-4 font-medium text-right">Preço médio</th>
                <th className="py-3 px-4 font-medium text-right">Preço atual</th>
                <th className="py-3 px-4 font-medium text-right">Investido</th>
                <th className="py-3 px-4 font-medium text-right">Valor hoje</th>
                <th className="py-3 px-4 font-medium text-right">Resultado</th>
                <th className="py-3 px-4 font-medium text-right">
                  Dividendos
                  <span className="block text-[10px] font-normal text-zinc-600">
                    % s/ preço médio
                  </span>
                </th>
                <th className="py-3 px-4 font-medium text-center">Compras</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr
                  key={`${p.ticker}-${p.asset_type}`}
                  className={cn(
                    'border-b border-white/5 hover:bg-white/[0.03] transition-colors',
                    pnlRowAccent(p.profitLossPercent)
                  )}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ResultIcon value={p.profitLossPercent} />
                      <span className="font-bold text-white">{p.ticker}</span>
                      <Badge
                        variant={
                          classifyTickerBucket(p.ticker) === 'core' ? 'success' : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {classifyTickerBucket(p.ticker) === 'core' ? 'Núcleo' : 'Oport.'}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {ASSET_TYPE_LABELS[p.asset_type]}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-200">
                    {p.totalQuantity}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-400">
                    {formatCurrency(p.averagePrice)}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-right tabular-nums font-medium',
                      priceVsAverageClass(p.currentPrice, p.averagePrice)
                    )}
                  >
                    {formatCurrency(p.currentPrice)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-400">
                    {formatCurrency(p.totalInvested)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-white">
                    {formatCurrency(p.currentValue)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={pnlPillClass(p.profitLoss)}>
                      {formatCurrency(p.profitLoss)}
                      <span className="ml-1 opacity-90">
                        ({formatPercent(p.profitLossPercent)})
                      </span>
                    </span>
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-right tabular-nums font-semibold',
                      dyClass(p.dividendYieldOnCost ?? p.dividendYield)
                    )}
                  >
                    {p.dividendYieldOnCost != null && p.dividendYieldOnCost > 0
                      ? `${p.dividendYieldOnCost.toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-zinc-400">{p.purchaseCount}</span>
                    {p.firstPurchaseDate && (
                      <span className="block text-[10px] text-zinc-600">
                        {formatDate(p.firstPurchaseDate)}
                        {p.purchaseCount > 1 && p.lastPurchaseDate
                          ? ` → ${formatDate(p.lastPurchaseDate)}`
                          : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.04] font-semibold border-t border-white/10">
                <td className="py-3 px-4 text-white" colSpan={5}>
                  Total · {positions.length} ativos
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-zinc-300">
                  {formatCurrency(totals.invested)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-white">
                  {formatCurrency(totals.value)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={pnlPillClass(totals.pl)}>
                    {formatCurrency(totals.pl)} ({formatPercent(totalPct)})
                  </span>
                </td>
                <td
                  className={cn(
                    'py-3 px-4 text-right tabular-nums font-semibold',
                    dyClass(avgDyOnCost)
                  )}
                >
                  {avgDyOnCost > 0 ? `${avgDyOnCost.toFixed(1)}%` : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500 px-1">
        Dividendos: proventos pagos nos últimos 12 meses ÷ seu preço médio de compra.
      </p>
    </div>
  );
}
