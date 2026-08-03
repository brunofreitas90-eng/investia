'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingDown, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MarketDropOpportunity, MarketDropsScanResult } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

const CLASS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  oportunidade_forte: 'success',
  possivel_oportunidade: 'success',
  neutro: 'secondary',
  atencao: 'warning',
  alto_risco: 'danger',
};

function DropList({
  title,
  items,
}: {
  title: string;
  items: MarketDropOpportunity[];
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-500">Nenhuma queda relevante no período.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((d) => (
          <div
            key={`${d.ticker}-${d.period}`}
            className="rounded-xl border border-white/[0.06] p-4 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white">{d.ticker}</span>
                {d.name && <span className="text-zinc-500 text-sm ml-2">{d.name}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-semibold">{d.changePercent.toFixed(1)}%</span>
                <Badge variant={CLASS_VARIANT[d.classification] ?? 'secondary'}>
                  {d.classificationLabel}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-zinc-300">{formatCurrency(d.price)}</p>
            <p className="text-sm"><strong>Motivo:</strong> {d.reason}</p>
            <p className="text-sm text-zinc-400"><strong>Análise:</strong> {d.analysis}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MarketDropsPanel() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<MarketDropsScanResult | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/drops');
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">
          Monitoramento diário com classificação por IA (BRAPI + Yahoo)
        </p>
        <Button variant="outline" size="sm" onClick={scan} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>
      {loading && !result ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
          </CardContent>
        </Card>
      ) : result ? (
        <>
          <DropList title="Maiores quedas do dia" items={result.day} />
          <DropList title="Maiores quedas da semana" items={result.week} />
          <DropList title="Maiores quedas do mês" items={result.month} />
        </>
      ) : null}
    </div>
  );
}
