'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, Loader2, RefreshCw, Calendar, PiggyBank, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadClientPortfolio } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import type { SmartInsight, SmartInsightsResult } from '@/lib/investment-advice-types';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<SmartInsight['type'], typeof Lightbulb> = {
  com_date: Calendar,
  buy_opportunity: TrendingDown,
  rebalance: Lightbulb,
  guard_cash: PiggyBank,
  portfolio_tip: Lightbulb,
};

const PRIORITY_VARIANT: Record<SmartInsight['priority'], 'danger' | 'warning' | 'secondary'> = {
  alta: 'danger',
  media: 'warning',
  baixa: 'secondary',
};

export function SmartInsightsPanel() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SmartInsightsResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res: Response;
      if (isLocalClientMode()) {
        const items = loadClientPortfolio();
        res = await fetch('/api/alerts/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolioItems: items }),
        });
      } else {
        res = await fetch('/api/alerts/insights');
      }
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !result) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-400" />
          <p className="text-sm text-zinc-500 mt-2">Analisando datas COM e oportunidades...</p>
        </CardContent>
      </Card>
    );
  }

  if (!result?.insights.length) return null;

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          Avisos inteligentes
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-zinc-500">
          Atualizado automaticamente com sua carteira e a estratégia 85/15
        </p>
        {result.insights.map((insight) => {
          const Icon = TYPE_ICON[insight.type];
          return (
            <div
              key={insight.id}
              className="rounded-xl border border-white/[0.06] p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-white">{insight.title}</span>
                <Badge variant={PRIORITY_VARIANT[insight.priority]}>{insight.priority}</Badge>
              </div>
              <p className="text-sm text-zinc-300">{insight.message}</p>
              <details className="text-sm">
                <summary className="text-emerald-400/90 cursor-pointer hover:text-emerald-400">
                  Como chegamos aqui
                </summary>
                <pre className="mt-2 text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                  {insight.howWeDecided}
                </pre>
              </details>
              {insight.suggestedAction && (
                <p className="text-xs text-zinc-500">
                  Sugestão: {insight.suggestedAction}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
