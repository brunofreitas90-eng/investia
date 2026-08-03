import {
  buildPriceTargets,
  currentYield12m,
  sumDividendsLast12Months,
} from '@/lib/dividend-price-target';
import { getStrategySector } from '@/lib/investment-strategy';
import { normalizeTicker } from '@/lib/utils';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { getFundamentals, getQuote } from '@/services/market';

export interface CompanyResearchSnapshot {
  ticker: string;
  companyName: string;
  setor: string;
  precoAtual: number;
  variacaoDia: number;
  pe?: number;
  dyAtual12m?: number;
  proventos12mPorAcao: number;
  proventos12mDetalhe: { data: string; valor: number; tipo: string }[];
  proximaDataCom?: string;
  frequenciaPagamento?: string;
  pagamentosPorAno?: number;
  pagamentosUltimos12m?: number;
  mesesTipicosPagamento?: string[];
  calendarioResumo?: string;
  dividendScore?: number;
  precosTeto: {
    yieldAlvoPercent: number;
    precoMaximo: number;
    formula: string;
  }[];
  fontes: string[];
}

export async function researchCompanies(
  tickers: string[],
  targetYieldPercent: number | null
): Promise<CompanyResearchSnapshot[]> {
  const unique = [...new Set(tickers.map(normalizeTicker))].slice(0, 3);
  const results: CompanyResearchSnapshot[] = [];

  await Promise.all(
    unique.map(async (ticker) => {
      try {
        const [quote, fund, divReport] = await Promise.all([
          getQuote(ticker),
          getFundamentals(ticker),
          buildDividendHistoryReport(ticker),
        ]);

        if (!quote && !divReport) return;

        const payments = divReport?.payments ?? [];
        const proventos12m = sumDividendsLast12Months(payments);
        const precoAtual = divReport?.currentPrice ?? quote?.price ?? 0;
        const dy12 = currentYield12m(proventos12m, precoAtual);

        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        const proventos12mDetalhe = payments
          .filter((p) => p.paymentDate && new Date(p.paymentDate + 'T12:00:00') >= cutoff)
          .map((p) => ({
            data: p.paymentDate!,
            valor: Math.round(p.amountPerShare * 100) / 100,
            tipo: p.kind,
          }))
          .sort((a, b) => b.data.localeCompare(a.data));

        const nextCom = payments.find(
          (p) => p.comDate && p.comDate >= new Date().toISOString().split('T')[0]
        );

        results.push({
          ticker,
          companyName: divReport?.companyName ?? quote?.name ?? ticker,
          setor: getStrategySector(ticker),
          precoAtual: Math.round(precoAtual * 100) / 100,
          variacaoDia: Math.round((quote?.changePercent ?? 0) * 100) / 100,
          pe: fund?.pe ?? quote?.pe,
          dyAtual12m: dy12 != null ? Math.round(dy12 * 100) / 100 : fund?.dividendYield,
          proventos12mPorAcao: Math.round(proventos12m * 100) / 100,
          proventos12mDetalhe,
          proximaDataCom: nextCom?.comDate,
          frequenciaPagamento: divReport?.analytics.frequency,
          pagamentosPorAno: divReport?.analytics.paymentsPerYear,
          pagamentosUltimos12m: divReport?.analytics.paymentsLast12m,
          mesesTipicosPagamento: divReport?.analytics.typicalMonths,
          calendarioResumo: divReport?.analytics.scheduleSummary,
          dividendScore: divReport?.analytics.dividendScore,
          precosTeto: buildPriceTargets(proventos12m, targetYieldPercent).map((p) => ({
            yieldAlvoPercent: p.yieldAlvoPercent,
            precoMaximo: p.precoMaximo,
            formula: p.formula,
          })),
          fontes: divReport?.dataSources ?? ['BRAPI', 'Yahoo Finance', 'B3'],
        });
      } catch {
        /* skip ticker */
      }
    })
  );

  return results.sort((a, b) => a.ticker.localeCompare(b.ticker));
}
