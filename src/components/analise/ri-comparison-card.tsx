'use client';

import { useState, useCallback } from 'react';
import { Loader2, GitCompare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RIComparisonReport } from '@/types';

const SENTIMENT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  muito_positivo: 'success',
  positivo: 'success',
  neutro: 'secondary',
  negativo: 'warning',
  muito_negativo: 'danger',
};

type Props = { ticker: string };

export function RIComparisonCard({ ticker }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RIComparisonReport | null>(null);

  const compare = useCallback(async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/ri-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) setReport(data);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Comparação de resultados (RI)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={compare} disabled={loading || !ticker}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Comparar períodos'}
        </Button>
      </CardHeader>
      {report && (
        <CardContent className="space-y-4">
          <Badge variant={SENTIMENT_VARIANT[report.sentiment] ?? 'secondary'}>
            {report.sentimentLabel}
          </Badge>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
            {report.plainLanguage}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}
