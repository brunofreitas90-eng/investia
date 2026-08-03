'use client';

import { useState } from 'react';
import { Loader2, Target, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyIncomeSimulation } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function MonthlyIncomeSimulator() {
  const [capital, setCapital] = useState('50000');
  const [goal, setGoal] = useState('2000');
  const [contribution, setContribution] = useState('500');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MonthlyIncomeSimulation | null>(null);

  async function simulate() {
    setLoading(true);
    try {
      const res = await fetch('/api/simulators/monthly-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capitalAvailable: Number(capital) || 0,
          monthlyGoal: Number(goal) || 0,
          monthlyContribution: Number(contribution) || 0,
          monthsToGoal: 240,
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            Modo Renda Mensal
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Simule quanto capital e tempo são necessários para viver de dividendos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Capital disponível (R$)</Label>
              <Input value={capital} onChange={(e) => setCapital(e.target.value)} type="number" />
            </div>
            <div>
              <Label>Meta renda mensal (R$)</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} type="number" />
            </div>
            <div>
              <Label>Aporte mensal (R$)</Label>
              <Input value={contribution} onChange={(e) => setContribution(e.target.value)} type="number" />
            </div>
          </div>
          <Button onClick={simulate} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            <span className="ml-2">Simular carteira</span>
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-zinc-500">Capital necessário (estimado)</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(result.capitalNeeded)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-zinc-500">Tempo para meta</p>
                <p className="text-2xl font-bold">~{result.estimatedYears} anos</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 text-sm text-zinc-300">{result.explanation}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carteira sugerida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.suggestedPortfolio.map((p) => (
                <div
                  key={p.ticker}
                  className="flex justify-between text-sm border-b border-white/5 py-2"
                >
                  <span>
                    {p.ticker} {p.name && `· ${p.name}`} ({p.weightPercent}%)
                  </span>
                  <span className="text-emerald-400">
                    ~{formatCurrency(p.monthlyIncomeEstimate)}/mês · DY {p.dividendYield}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {result.monthlyProjection.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projeção 24 meses</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.monthlyProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="income" name="Renda" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-amber-400/90">Riscos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                {result.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
