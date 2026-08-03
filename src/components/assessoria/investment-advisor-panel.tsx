'use client';

import { useState } from 'react';
import { Loader2, TrendingUp, Shield, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CORE_SECTOR_TARGET_PERCENT,
  CORE_TICKERS_BY_SECTOR,
  INVESTMENT_STRATEGY,
} from '@/lib/investment-strategy';
import { formatCurrency } from '@/lib/utils';
import { loadClientPortfolio } from '@/lib/client-local-storage';
import { isLocalClientMode } from '@/lib/client-data-mode';
import type { InvestmentAdviceReport, InvestmentRecommendation } from '@/services/ai/investment-advisor';
import { toast } from 'sonner';

const ACTION_LABELS: Record<InvestmentRecommendation['action'], string> = {
  comprar: 'Comprar',
  vender: 'Vender',
  manter: 'Manter',
  aguardar: 'Aguardar',
  guardar: 'Guardar em caixa',
};

const ACTION_VARIANT: Record<
  InvestmentRecommendation['action'],
  'success' | 'warning' | 'danger' | 'secondary'
> = {
  comprar: 'success',
  vender: 'danger',
  manter: 'secondary',
  aguardar: 'warning',
  guardar: 'warning',
};

async function getPortfolioItems() {
  if (isLocalClientMode()) {
    return loadClientPortfolio();
  }
  const res = await fetch('/api/portfolio');
  if (res.ok) {
    const data = await res.json();
    return data.items ?? [];
  }
  return [];
}

export function InvestmentAdvisorPanel() {
  const [capital, setCapital] = useState('10000');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InvestmentAdviceReport | null>(null);

  async function analyze() {
    const amount = Number(capital);
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      const portfolioItems = await getPortfolioItems();
      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capitalAvailable: amount, portfolioItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro na análise');
        return;
      }
      setReport(data);
    } catch {
      toast.error('Falha na conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            Sua estratégia
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400 space-y-2">
          <p>
            Objetivo: viver de dividendos no longo prazo. No núcleo, priorizamos as empresas que{' '}
            <span className="text-zinc-200">mais pagam em relação ao preço atual</span>, por setor,
            tentando baixar o seu preço médio.
          </p>
          <p>
            {INVESTMENT_STRATEGY.coreAllocationPercent}% núcleo ·{' '}
            {INVESTMENT_STRATEGY.opportunityAllocationPercent}% oportunidades (commodities:
            descontada+dividendos, alto DY seguro ou crescimento — senão, caixa).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            {Object.entries(CORE_SECTOR_TARGET_PERCENT).map(([sector, pct]) => (
              <div key={sector} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span className="text-emerald-400 font-semibold">{pct}%</span>
                <span className="text-zinc-500 ml-1">{sector}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
            {Object.entries(CORE_TICKERS_BY_SECTOR).map(([sector, tickers]) => (
              <div key={sector} className="rounded-lg bg-black/20 px-3 py-2">
                <span className="text-emerald-400/90 font-medium">{sector}: </span>
                <span className="text-zinc-400">{tickers.join(', ')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Quanto tenho para investir agora?
          </CardTitle>
          <p className="text-sm text-zinc-500">
            O assessor analisa cotações, dividendos, datas COM e sua carteira em tempo real
          </p>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label>Valor disponível (R$)</Label>
            <Input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="10000"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={analyze} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span className="ml-2">Analisar e recomendar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Consultando mercado e montando recomendações...</p>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <>
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={report.mode === 'ai' ? 'success' : 'warning'}>
                  {report.mode === 'ai' ? 'Assessor IA' : 'Análise por regras'}
                </Badge>
                <Badge variant="secondary">
                  Núcleo {report.portfolioAnalysis.currentCorePercent}% · Oport.{' '}
                  {report.portfolioAnalysis.currentOpportunityPercent}%
                </Badge>
              </div>
              <p className="text-zinc-200 leading-relaxed">{report.summary}</p>
              {report.teachingNote && (
                <p className="text-sm text-emerald-400/80 border-t border-white/5 pt-3">
                  {report.teachingNote}
                </p>
              )}
              {report.opportunityReserved > 0 && (
                <p className="text-sm text-amber-400/90">
                  Reservado em caixa (oportunidades): {formatCurrency(report.opportunityReserved)}
                </p>
              )}
            </CardContent>
          </Card>

          {report.sectorAllocation?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alocação por setor — meta vs carteira</CardTitle>
                <p className="text-sm text-zinc-500">
                  Objetivo: viver de dividendos com empresas sólidas. Valores sugeridos para o capital informado.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-zinc-500">
                      <th className="text-left py-2 pr-3">Setor</th>
                      <th className="text-right py-2 px-2">Meta</th>
                      <th className="text-right py-2 px-2">Atual</th>
                      <th className="text-right py-2 px-2">Gap</th>
                      <th className="text-right py-2 pl-2">Sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sectorAllocation.map((row) => (
                      <tr key={row.sector} className="border-b border-white/[0.04]">
                        <td className="py-3 pr-3">
                          <span className="font-medium text-zinc-200">{row.sector}</span>
                          <p className="text-xs text-zinc-500 mt-0.5">{row.note}</p>
                        </td>
                        <td className="text-right py-3 px-2 text-emerald-400 tabular-nums">
                          {row.targetPercent}%
                        </td>
                        <td className="text-right py-3 px-2 text-zinc-300 tabular-nums">
                          {row.currentPercent}%
                        </td>
                        <td
                          className={`text-right py-3 px-2 tabular-nums ${
                            row.gapPercent > 0
                              ? 'text-amber-400'
                              : row.gapPercent < 0
                                ? 'text-red-400'
                                : 'text-zinc-500'
                          }`}
                        >
                          {row.gapPercent > 0 ? '+' : ''}
                          {row.gapPercent} p.p.
                        </td>
                        <td className="text-right py-3 pl-2 text-white tabular-nums font-medium">
                          {formatCurrency(row.suggestedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {report.calendarTips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datas COM — timing de proventos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400 space-y-1">
                {report.calendarTips.map((t, i) => (
                  <p key={i}>• {t}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recomendações ({formatCurrency(report.capitalAvailable)})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.recommendations.map((rec, i) => (
                <div
                  key={`${rec.ticker}-${i}`}
                  className="rounded-xl border border-white/[0.06] p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{rec.ticker}</span>
                      <Badge variant={ACTION_VARIANT[rec.action]}>
                        {ACTION_LABELS[rec.action]}
                      </Badge>
                      <Badge variant="secondary">
                        {rec.bucket === 'core' ? 'Núcleo' : 'Oportunidade'}
                      </Badge>
                      {rec.situationLabel && (
                        <Badge variant="success">{rec.situationLabel}</Badge>
                      )}
                    </div>
                    {rec.suggestedAmount > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(rec.suggestedAmount)}
                        {rec.allocationPercent > 0 && (
                          <span className="text-zinc-500 font-normal text-sm ml-1">
                            ({rec.allocationPercent}%)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300">{rec.reason}</p>
                  {rec.foundation && (
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                      <p className="text-[11px] uppercase tracking-wide text-emerald-400/80 mb-1">
                        Fundamentação
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{rec.foundation}</p>
                    </div>
                  )}
                  {(rec.dividendYieldOnPrice != null || rec.currentPrice != null) && (
                    <p className="text-xs text-zinc-500">
                      {rec.dividendYieldOnPrice != null && (
                        <span>DY s/ preço ~{rec.dividendYieldOnPrice.toFixed(1)}%</span>
                      )}
                      {rec.currentPrice != null && (
                        <span>
                          {rec.dividendYieldOnPrice != null ? ' · ' : ''}
                          Preço {formatCurrency(rec.currentPrice)}
                        </span>
                      )}
                      {rec.userAveragePrice != null && (
                        <span> · Seu médio {formatCurrency(rec.userAveragePrice)}</span>
                      )}
                    </p>
                  )}
                  {rec.howWeDecided && (
                    <details className="text-sm">
                      <summary className="text-emerald-400/90 cursor-pointer">
                        Como chegamos aqui
                      </summary>
                      <pre className="mt-2 text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                        {rec.howWeDecided}
                      </pre>
                    </details>
                  )}
                  {rec.suggestedQuantity != null && rec.suggestedQuantity > 0 && (
                    <p className="text-xs text-zinc-500">
                      ~{rec.suggestedQuantity} ações (estimativa)
                    </p>
                  )}
                  {rec.comTiming && (
                    <p className="text-xs text-violet-400">{rec.comTiming}</p>
                  )}
                  {rec.risks.length > 0 && (
                    <p className="text-xs text-amber-400/90">
                      Riscos: {rec.risks.join(' ')}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-zinc-600 text-center">
            Recomendações baseadas em dados públicos (BRAPI/Yahoo). Decisão final é sua.
            Fontes: {report.dataSources.join(', ')}
          </p>
        </>
      )}
    </div>
  );
}
