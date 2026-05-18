'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Coins,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/dashboard/stat-card';
import { PortfolioChart } from '@/components/dashboard/portfolio-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { demoStats } from '@/lib/demo-data';
import { isDemoModeClient, loadDemoPortfolio } from '@/lib/demo-portfolio-storage';
import { demoPortfolio } from '@/lib/demo-data';
import { buildDashboardStats } from '@/lib/portfolio';
import { buildPatrimonyChartFromPortfolio } from '@/lib/portfolio-chart-data';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { DashboardStats, PortfolioSummary } from '@/types';
import type { DividendsSummary } from '@/services/dividends/portfolio-dividends';
import type { FinancialEvent } from '@/types';

async function fetchDividendsForDashboard(): Promise<number> {
  if (isDemoModeClient()) {
    const stored = loadDemoPortfolio();
    const items = stored?.length ? stored : demoPortfolio;
    const res = await fetch('/api/dividends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      const data: DividendsSummary = await res.json();
      return data.received12m;
    }
    return 0;
  }

  const res = await fetch('/api/dividends');
  if (res.ok) {
    const data: DividendsSummary = await res.json();
    return data.received12m;
  }
  return 0;
}

async function fetchPortfolioForDashboard(): Promise<PortfolioSummary> {
  if (isDemoModeClient()) {
    const stored = loadDemoPortfolio();
    const items = stored?.length ? stored : demoPortfolio;
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (res.ok) return res.json();
  }
  const res = await fetch('/api/portfolio');
  return res.json();
}

export default function DashboardPage() {
  const { preferences } = useUserPreferences();
  const [stats, setStats] = useState<DashboardStats>(demoStats);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [dividendsReceived, setDividendsReceived] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calendarPromise = isDemoModeClient()
      ? fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: loadDemoPortfolio()?.length ? loadDemoPortfolio() : demoPortfolio,
          }),
        }).then((r) => (r.ok ? r.json() : { events: [] }))
      : fetch('/api/calendar').then((r) => (r.ok ? r.json() : { events: [] }));

    Promise.all([
      fetchPortfolioForDashboard(),
      fetchDividendsForDashboard(),
      calendarPromise,
    ])
      .then(([portfolio, dividendsTotal, calendar]) => {
        const data = portfolio as PortfolioSummary;
        if (data.totalInvested != null) {
          setSummary(data);
          setDividendsReceived(dividendsTotal);
          setStats(buildDashboardStats(data, dividendsTotal));
          setChartData(
            buildPatrimonyChartFromPortfolio(data.items, data.currentValue)
          );
        }
        const cal = calendar as { events?: FinancialEvent[] };
        const today = new Date().toISOString().split('T')[0];
        const upcoming = (cal.events ?? [])
          .filter((e) => e.event_date >= today)
          .slice(0, 5);
        setCalendarEvents(upcoming);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgYield =
    summary && summary.items.length > 0
      ? summary.items.reduce((s, i) => s + (i.dividend_yield ?? 0), 0) /
        summary.items.length
      : 0;

  return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do seu patrimônio" />
      <div
        className={cn(
          'flex-1 overflow-auto',
          preferences.compactDashboard ? 'p-3 lg:p-5 space-y-4' : 'p-4 lg:p-8 space-y-6'
        )}
      >
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Atualizando patrimônio...
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Patrimônio Atual"
            value={stats.currentPatrimony}
            change={stats.profitLossPercent}
            icon={Wallet}
          />
          <StatCard
            title="Total Investido"
            value={stats.totalInvested}
            icon={TrendingUp}
          />
          <StatCard
            title="Lucro / Prejuízo"
            value={stats.profitLoss}
            change={stats.profitLossPercent}
            icon={stats.profitLoss >= 0 ? TrendingUp : TrendingDown}
          />
          <StatCard
            title="Dividendos Recebidos"
            value={stats.dividendsReceived}
            icon={Coins}
          />
        </div>

        <div
          className={cn(
            'grid grid-cols-1 gap-6',
            preferences.showPatrimonyChart ? 'xl:grid-cols-3' : 'xl:grid-cols-1'
          )}
        >
          {preferences.showPatrimonyChart && (
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Evolução do Patrimônio</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioChart data={chartData} />
                <p className="text-xs text-zinc-600 mt-2">
                  Baseado nos aportes da carteira e patrimônio atual.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                Calendário Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {calendarEvents.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum evento próximo na carteira.</p>
              ) : (
                calendarEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{event.title}</p>
                      <p className="text-xs text-zinc-500">
                        {event.ticker} · {event.event_date}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <p className="text-xs text-zinc-600">
                <a href="/calendario" className="text-emerald-400 hover:underline">
                  Ver calendário completo
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2',
            preferences.compactDashboard ? 'gap-4' : 'gap-6'
          )}
        >
          <Card>
            <CardHeader>
              <CardTitle>Melhores Ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.bestAssets.length === 0 ? (
                <p className="text-sm text-zinc-500">Adicione ativos na carteira.</p>
              ) : (
                stats.bestAssets.map((a) => (
                  <div
                    key={a.ticker}
                    className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5"
                  >
                    <span className="font-medium">{a.ticker}</span>
                    <Badge variant="success">{formatPercent(a.return)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Piores Ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.worstAssets.length === 0 ? (
                <p className="text-sm text-zinc-500">Adicione ativos na carteira.</p>
              ) : (
                stats.worstAssets.map((a) => (
                  <div
                    key={a.ticker}
                    className="flex justify-between items-center p-3 rounded-xl bg-red-500/5"
                  >
                    <span className="font-medium">{a.ticker}</span>
                    <Badge variant={a.return >= 0 ? 'success' : 'danger'}>
                      {formatPercent(a.return)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {summary && summary.allocation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Alocação por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {summary.allocation.map((a) => (
                  <div
                    key={a.type}
                    className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <p className="text-xs text-zinc-500">{a.type}</p>
                    <p className="font-semibold">{formatCurrency(a.value)}</p>
                    <p className="text-sm text-emerald-400">{a.percent.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Rendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-white/[0.02]">
                <p className="text-sm text-zinc-500">Rendimento Mensal</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatPercent(stats.monthlyReturn)}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/[0.02]">
                <p className="text-sm text-zinc-500">Rendimento Anual</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatPercent(stats.annualReturn)}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/[0.02]">
                <p className="text-sm text-zinc-500">Renda Passiva/mês</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(
                    dividendsReceived > 0
                      ? dividendsReceived / 12
                      : stats.dividendsReceived / 12,
                    preferences.defaultCurrency
                  )}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/[0.02]">
                <p className="text-sm text-zinc-500">Yield Médio</p>
                <p className="text-xl font-bold text-white">
                  {avgYield > 0 ? `${avgYield.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

