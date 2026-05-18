'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Target, FileText, Calendar, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyAnalysis } from '@/types';
import { formatCurrency, formatPercent, formatPercentExact, formatDateBR, cn } from '@/lib/utils';

interface RIAnalysisViewProps {
  analysis: CompanyAnalysis;
}

export function RIAnalysisView({ analysis }: RIAnalysisViewProps) {
  const ri = analysis.riReport;
  if (!ri) return null;

  const currency = ri.metrics.currency;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={BarChart3}
          label="Retorno último ano"
          value={formatPercentExact(ri.annualReturnPercent)}
          sub={`Preço ${formatPercentExact(ri.annualPriceReturnPercent)} + Div. ${formatPercentExact(ri.annualDividendReturnPercent)}`}
          positive={ri.annualReturnPercent >= 0}
        />
        <MetricCard
          icon={Target}
          label="Retorno projetado"
          value={`~${formatPercent(ri.projectedReturnPercent)}`}
          sub="Próximos 12 meses (estimativa)"
          positive={ri.projectedReturnPercent >= 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Preço atual"
          value={formatCurrency(ri.metrics.price, currency)}
          sub={ri.companyName}
        />
        <MetricCard
          icon={FileText}
          label="P/L · ROE"
          value={`${ri.metrics.pe?.toFixed(1) ?? '—'} · ${ri.metrics.roe != null ? `${ri.metrics.roe.toFixed(0)}%` : '—'}`}
          sub={`Yield ${ri.metrics.dividendYield?.toFixed(1) ?? '—'}%`}
        />
      </div>

      {ri.dividendCalendar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              Dividendos e datas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DividendField
                icon={Calendar}
                label="Próxima data COM"
                value={ri.dividendCalendar.nextComDate ? formatDateBR(ri.dividendCalendar.nextComDate) : 'Sem data prevista'}
              />
              <DividendField
                label="Último dividendo"
                value={
                  ri.dividendCalendar.lastDividend?.paymentDate
                    ? `${formatCurrency(ri.dividendCalendar.lastDividend.amountPerShare ?? 0, currency)} · ${formatDateBR(ri.dividendCalendar.lastDividend.paymentDate)}`
                    : 'N/D'
                }
                sub={
                  ri.dividendCalendar.lastDividend?.comDate
                    ? `COM: ${formatDateBR(ri.dividendCalendar.lastDividend.comDate)}`
                    : undefined
                }
              />
              <DividendField
                label="Próximo dividendo"
                value={
                  ri.dividendCalendar.nextDividend?.paymentDate
                    ? `${formatCurrency(ri.dividendCalendar.nextDividend.amountPerShare ?? 0, currency)} · ${formatDateBR(ri.dividendCalendar.nextDividend.paymentDate)}`
                    : 'Sem previsão'
                }
                sub={
                  ri.dividendCalendar.nextDividend?.comDate
                    ? `COM: ${formatDateBR(ri.dividendCalendar.nextDividend.comDate)}`
                    : undefined
                }
              />
              <DividendField
                label="Retorno exato (12 meses)"
                value={formatPercentExact(ri.annualReturnPercent)}
                highlight
              />
              <DividendField
                label="Frequência de pagamento"
                value={ri.dividendCalendar.paymentFrequency}
              />
              <DividendField
                label="Pagamentos no último ano"
                value={String(ri.dividendCalendar.paymentsLast12Months)}
                sub={`Total: ${formatCurrency(ri.dividendCalendar.totalDividendsLast12m, currency)} por ação`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução do preço (12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ri.priceHistory}>
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  fontSize={11}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={11}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => v.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                  formatter={(v) => [formatCurrency(Number(v), currency), 'Preço']}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Análise de crescimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 leading-relaxed">{ri.growthAnalysis}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Números da empresa (RI)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 leading-relaxed">{ri.numbersAnalysis}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {ri.highlights.map((h) => (
                <div
                  key={h.label}
                  className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <p className="text-xs text-zinc-500">{h.label}</p>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      h.trend === 'up' && 'text-emerald-400',
                      h.trend === 'down' && 'text-red-400',
                      h.trend === 'neutral' && 'text-white'
                    )}
                  >
                    {h.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Fontes: {ri.dataSource.join(' · ')}. Dados equivalentes a relatórios públicos (RI/CVM).
        Retorno projetado é estimativa, não recomendação de investimento.
      </p>
    </div>
  );
}

function DividendField({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      {Icon && <Icon className="h-4 w-4 text-emerald-400 mb-2" />}
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn('text-sm font-semibold mt-1', highlight ? 'text-emerald-400 text-lg' : 'text-white')}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <Icon
            className={cn(
              'h-5 w-5',
              positive === true && 'text-emerald-400',
              positive === false && 'text-red-400',
              positive === undefined && 'text-zinc-500'
            )}
          />
          {positive !== undefined && (
            positive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-3">{label}</p>
        <p className="text-xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
