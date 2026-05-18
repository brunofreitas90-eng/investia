'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RIAnalysisView } from '@/components/analise/ri-analysis-view';
import { BuyScoreCard } from '@/components/analise/buy-score-card';
import { popularTickers } from '@/lib/demo-data';
import type { CompanyAnalysis } from '@/types';
import { toast } from 'sonner';

export function AnaliseContent() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);

  const analyze = useCallback(async (t: string) => {
    const symbol = t.toUpperCase().trim();
    if (!symbol) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao analisar empresa');
        return;
      }

      setAnalysis(data);
      toast.success(`Análise de ${symbol} concluída`);
    } catch {
      toast.error('Falha na conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get('ticker')?.toUpperCase().trim();
    if (fromUrl) {
      setTicker(fromUrl);
      analyze(fromUrl);
    }
  }, [searchParams, analyze]);

  return (
    <PageWrapper
      title="IA Analista"
      subtitle="Leitura de dados do RI, crescimento, retorno anual e projeção"
    >
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Analisamos demonstrações e indicadores públicos (equivalentes ao RI da empresa):
              P/L, ROE, dividendos, histórico de preços e retorno projetado.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="PETR4, VALE3, ITUB4, AAPL, NVDA..."
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && ticker && analyze(ticker)}
                disabled={loading}
              />
              <Button onClick={() => analyze(ticker)} disabled={loading || !ticker}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Analisar RI
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {popularTickers.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTicker(t);
                    analyze(t);
                  }}
                  className="px-3 py-1 text-xs rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {t}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
              <p className="text-zinc-400">
                Lendo dados financeiros e montando análise de crescimento...
              </p>
            </CardContent>
          </Card>
        )}

        {analysis && !loading && (
          <>
            <BuyScoreCard analysis={analysis} />

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{analysis.riReport?.companyName ?? analysis.ticker}</CardTitle>
                  <p className="text-sm text-zinc-500 mt-1">{analysis.ticker}</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-white leading-relaxed">{analysis.plainLanguage}</p>
              </CardContent>
            </Card>

            {analysis.riReport && <RIAnalysisView analysis={analysis} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parecer da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Valuation', analysis.valuation],
                    ['Dívida', analysis.debt],
                    ['Lucro', analysis.profit],
                    ['Crescimento', analysis.growth],
                    ['Dividendos', analysis.dividends],
                    ['Governança', analysis.governance],
                    ['Tendência', analysis.trend],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <p className="text-xs text-zinc-500 mb-1">{label}</p>
                      <p className="text-sm text-zinc-200">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

