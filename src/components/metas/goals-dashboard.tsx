'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target,
  TrendingUp,
  Calendar,
  PiggyBank,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useGoals } from '@/hooks/use-goals';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { calculateCompoundInterest } from '@/lib/compound-interest';
import { RISK_ANNUAL_RATES } from '@/lib/goal-progress';
import type { FinancialGoal } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const RISK_OPTIONS: {
  value: NonNullable<FinancialGoal['riskProfile']>;
  label: string;
  rate: number;
}[] = [
  { value: 'conservative', label: 'Conservador', rate: RISK_ANNUAL_RATES.conservative },
  { value: 'moderate', label: 'Moderado', rate: RISK_ANNUAL_RATES.moderate },
  { value: 'aggressive', label: 'Arrojado', rate: RISK_ANNUAL_RATES.aggressive },
];

export function GoalsDashboard() {
  const { preferences } = useUserPreferences();
  const { report, loading, saving, isDemo, refresh, saveGoal, previewGoal } =
    useGoals();

  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [riskProfile, setRiskProfile] =
    useState<NonNullable<FinancialGoal['riskProfile']>>('moderate');

  const formInitialized = useRef(false);
  useEffect(() => {
    if (!report || formInitialized.current) return;
    formInitialized.current = true;
    const g = report.goal;
    setTargetAmount(String(g.targetAmount ?? ''));
    setTargetDate(g.targetDate ?? '');
    setMonthlyContribution(String(g.monthlyContribution ?? ''));
    setRiskProfile(g.riskProfile ?? preferences.defaultRiskProfile ?? 'moderate');
  }, [report, preferences.defaultRiskProfile]);

  const draftGoal: FinancialGoal = useMemo(
    () => ({
      targetAmount: parseFloat(targetAmount) || 0,
      targetDate: targetDate || undefined,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      riskProfile,
    }),
    [targetAmount, targetDate, monthlyContribution, riskProfile]
  );

  useEffect(() => {
    if (!report || loading) return;
    const t = setTimeout(() => {
      previewGoal(draftGoal, report.currentPatrimony);
    }, 400);
    return () => clearTimeout(t);
  }, [draftGoal, loading, previewGoal, report?.currentPatrimony]);

  const chartData = useMemo(() => {
    if (!report) return [];
    const years =
      report.yearsToReachTarget != null
        ? Math.max(1, Math.min(30, Math.ceil(report.yearsToReachTarget) + 1))
        : 10;
    const result = calculateCompoundInterest({
      initialAmount: report.currentPatrimony,
      monthlyContribution: draftGoal.monthlyContribution ?? 0,
      annualRatePercent: report.annualRatePercent,
      years,
      frequency: 'monthly',
    });
    return result.timeline.map((p) => ({
      name: p.label,
      Total: Math.round(p.total),
    }));
  }, [report, draftGoal.monthlyContribution, draftGoal.targetAmount]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveGoal(draftGoal);
  };

  if (loading && !report) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const progress = report?.progressPercent ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {isDemo && (
        <p className="text-xs text-zinc-500">Modo demo — meta salva no navegador.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <Target className="h-3 w-3" /> Patrimônio atual
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(report?.currentPatrimony ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">Meta</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(draftGoal.targetAmount ?? 0)}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Faltam {formatCurrency(report?.remainingAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Prazo
            </p>
            <p className="text-lg font-bold mt-1">
              {draftGoal.targetDate ? formatDate(draftGoal.targetDate) : '—'}
            </p>
            {report?.daysToTargetDate != null && draftGoal.targetDate && (
              <p className="text-xs text-zinc-600 mt-1">
                {report.daysToTargetDate} dias restantes
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Projeção na data
            </p>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(report?.projectedAtTargetDate ?? 0)}
            </p>
            {report && draftGoal.targetDate && (
              <Badge
                variant={report.onTrack ? 'success' : 'warning'}
                className="mt-2 gap-1"
              >
                {report.onTrack ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> No caminho
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" /> Ajustar plano
                  </>
                )}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Progresso</span>
            <span className="font-semibold text-emerald-400">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-500">{report?.suggestion}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-400" />
            Definir meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Valor alvo (R$)</Label>
              <Input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="100000"
                required
              />
            </div>
            <div>
              <Label>Data alvo</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Aporte mensal (R$)</Label>
              <Input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div>
              <Label>Perfil de risco (rentabilidade estimada)</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                value={riskProfile}
                onChange={(e) =>
                  setRiskProfile(
                    e.target.value as NonNullable<FinancialGoal['riskProfile']>
                  )
                }
              >
                {RISK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900">
                    {o.label} (~{o.rate}% a.a.)
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar meta'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projeção patrimonial</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                  formatter={(value) => [
                    formatCurrency(Number(value) || 0),
                    'Total',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#34d399"
                  fill="url(#goalFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            {report?.yearsToReachTarget != null && (
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Estimativa para atingir a meta: ~{report.yearsToReachTarget} ano(s) com
                os parâmetros atuais.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
