'use client';

import { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Loader2, Search, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { popularTickers } from '@/lib/demo-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DividendHistoryReport } from '@/types';
import { PaymentScheduleDisplay } from '@/components/dividendos/payment-schedule-display';
import { toast } from 'sonner';

const KIND_LABELS: Record<string, string> = {
  dividendo: 'Dividendo',
  jcp: 'JSCP',
  rendimento: 'Rendimento',
  outro: 'Outro',
};

export function DividendHistoryPanel() {
  const [ticker, setTicker] = useState('PETR4');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DividendHistoryReport | null>(null);

  const load = useCallback(async (t: string) => {
    const symbol = t.toUpperCase().trim();
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dividends/history?ticker=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao carregar histórico');
        setReport(null);
        return;
      }
      setReport(data);
    } catch {
      toast.error('Falha na conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  const chartData =
    report?.analytics.yearlyTotals.map((y) => ({
      year: String(y.year),
      total: y.total,
    })) ?? [];

  const yieldData =
    report?.yieldHistory.map((y) => ({
      year: String(y.year),
      yield: Math.round(y.yieldPercent * 100) / 100,
    })) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico completo por empresa</CardTitle>
          <p className="text-sm text-zinc-500">
            Dividendos, JCP, datas COM/EX/pagamento e nota de proventos (fontes públicas:
            BRAPI/B3 + Yahoo Finance)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Ex: PETR4"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="max-w-[140px]"
            />
            <Button onClick={() => load(ticker)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularTickers.slice(0, 8).map((t) => (
              <Button key={t} variant="outline" size="sm" onClick={() => { setTicker(t); load(t); }}>
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Nota dividendos</p>
                <p className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
                  <Star className="h-5 w-5" />
                  {report.analytics.dividendScore}/10
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Frequência</p>
                <p className="text-sm font-medium mt-1">{report.analytics.frequency}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {report.analytics.paymentsPerYear}x por ano
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Pagamentos (12m)</p>
                <p className="text-2xl font-bold mt-1 text-white">
                  {report.analytics.paymentsLast12m}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Consistência</p>
                <p className="text-sm font-medium mt-1">{report.analytics.consistencyScore}/10</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quando costuma pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentScheduleDisplay
                frequency={report.analytics.frequency}
                paymentsPerYear={report.analytics.paymentsPerYear}
                paymentsLast12m={report.analytics.paymentsLast12m}
                typicalMonths={report.analytics.typicalMonths}
                scheduleSummary={report.analytics.scheduleSummary}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-sm text-zinc-400">
              {report.analytics.dividendScoreExplanation}
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução anual dos proventos</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="year" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v ?? 0))}
                      contentStyle={{ background: '#111', border: '1px solid #333' }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {yieldData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dividend Yield histórico (%)</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="year" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="yield" stroke="#34d399" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos ({report.payments.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/10">
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Valor/ação</th>
                    <th className="text-left py-2">COM</th>
                    <th className="text-left py-2">EX</th>
                    <th className="text-left py-2">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {report.payments.slice(0, 40).map((p, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2">
                        <Badge variant="secondary">{KIND_LABELS[p.kind] ?? p.kind}</Badge>
                      </td>
                      <td className="py-2">{formatCurrency(p.amountPerShare)}</td>
                      <td className="py-2">{p.comDate ? formatDate(p.comDate) : '—'}</td>
                      <td className="py-2">{p.exDate ? formatDate(p.exDate) : '—'}</td>
                      <td className="py-2">{p.paymentDate ? formatDate(p.paymentDate) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
