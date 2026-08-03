'use client';

import { useEffect, useState } from 'react';
import { Loader2, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyAutoRating } from '@/types';

const DIM_LABELS: Record<string, string> = {
  dividends: 'Dividendos',
  growth: 'Crescimento',
  profit: 'Lucro',
  debt: 'Endividamento',
  governance: 'Governança',
  consistency: 'Consistência',
};

type Props = { ticker: string };

export function CompanyScoreCard({ ticker }: Props) {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<CompanyAutoRating | null>(null);

  useEffect(() => {
    if (!ticker.trim()) return;
    setLoading(true);
    fetch(`/api/companies/score?ticker=${encodeURIComponent(ticker.toUpperCase())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ticker) setRating(data);
      })
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </CardContent>
      </Card>
    );
  }

  if (!rating) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-400" />
          Nota automática da empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold text-emerald-400">{rating.finalScore.toFixed(1)}/10</p>
        <p className="text-sm text-zinc-400">{rating.explanation}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(rating.dimensions).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="text-zinc-500">{DIM_LABELS[k]}</span>
              <p className="font-semibold">{v}/10</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
