'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Calculator, TrendingUp, PiggyBank, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateCompoundInterest, type CompoundingFrequency } from '@/lib/compound-interest';
import { formatCurrency, formatPercent } from '@/lib/utils';

const FREQUENCY_OPTIONS: { value: CompoundingFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

export function CompoundInterestCalculator() {
  const [initial, setInitial] = useState('10000');
  const [monthly, setMonthly] = useState('500');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');
  const [frequency, setFrequency] = useState<CompoundingFrequency>('monthly');

  const result = useMemo(() => {
    return calculateCompoundInterest({
      initialAmount: parseFloat(initial) || 0,
      monthlyContribution: parseFloat(monthly) || 0,
      annualRatePercent: parseFloat(rate) || 0,
      years: parseFloat(years) || 1,
      frequency,
    });
  }, [initial, monthly, rate, years, frequency]);

  const chartData = result.timeline.map((p) => ({
    name: p.label,
    Investido: Math.round(p.invested),
    Juros: Math.round(p.interest),
    Total: Math.round(p.total),
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-emerald-400" />
            Parâmetros da simulação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Valor inicial (R$)" value={initial} onChange={setInitial} placeholder="10000" />
            <Field label="Aporte mensal (R$)" value={monthly} onChange={setMonthly} placeholder="500" />
            <Field label="Taxa de juros anual (%)" value={rate} onChange={setRate} placeholder="12" />
            <Field label="Período (anos)" value={years} onChange={setYears} placeholder="10" />
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Capitalização dos juros</Label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CompoundingFrequency)}
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResultCard
          icon={TrendingUp}
          label="Montante final"
          value={formatCurrency(result.finalAmount)}
          accent
        />
        <ResultCard
          icon={PiggyBank}
          label="Total investido"
          value={formatCurrency(result.totalInvested)}
        />
        <ResultCard
          icon={Sparkles}
          label="Juros ganhos"
          value={formatCurrency(result.totalInterest)}
          sub={`Taxa efetiva: ${formatPercent(result.effectiveAnnualRate)} a.a.`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução do patrimônio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorJuros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} />
                <YAxis
                  stroke="#52525b"
                  fontSize={11}
                  tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    String(name),
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Investido"
                  stackId="1"
                  stroke="#71717a"
                  fill="url(#colorInvestido)"
                />
                <Area
                  type="monotone"
                  dataKey="Juros"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#colorJuros)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center">
            Fórmula: M = C × (1 + i)^n + P × [((1 + i)^n − 1) / i] — valores aproximados para planejamento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo por período</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-white/10">
                <th className="text-left py-2 font-medium">Período</th>
                <th className="text-right py-2 font-medium">Investido</th>
                <th className="text-right py-2 font-medium">Juros</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.timeline.map((row) => (
                <tr key={row.period} className="border-b border-white/[0.04] text-zinc-300">
                  <td className="py-2.5">{row.label}</td>
                  <td className="py-2.5 text-right">{formatCurrency(row.invested)}</td>
                  <td className="py-2.5 text-right text-emerald-400">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-white">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-emerald-500/30 bg-emerald-500/5' : undefined}>
      <CardContent className="p-5">
        <Icon className={`h-5 w-5 mb-3 ${accent ? 'text-emerald-400' : 'text-zinc-500'}`} />
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-xl font-bold mt-1 ${accent ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
