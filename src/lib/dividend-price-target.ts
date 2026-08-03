import type { DividendHistoryPayment } from '@/types';

export interface PriceTargetForYield {
  yieldAlvoPercent: number;
  precoMaximo: number;
  proventos12mPorAcao: number;
  formula: string;
}

/** Soma proventos pagos por ação nos últimos 12 meses (rolling) */
export function sumDividendsLast12Months(payments: DividendHistoryPayment[]): number {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  return payments
    .filter((p) => {
      if (!p.paymentDate) return false;
      return new Date(p.paymentDate + 'T12:00:00') >= cutoff;
    })
    .reduce((s, p) => s + p.amountPerShare, 0);
}

export function currentYield12m(
  dividends12mPerShare: number,
  currentPrice: number
): number | null {
  if (currentPrice <= 0 || dividends12mPerShare <= 0) return null;
  return (dividends12mPerShare / currentPrice) * 100;
}

export function maxPriceForTargetYield(
  dividends12mPerShare: number,
  targetYieldPercent: number
): number | null {
  if (targetYieldPercent <= 0 || dividends12mPerShare <= 0) return null;
  return dividends12mPerShare / (targetYieldPercent / 100);
}

export function buildPriceTargets(
  dividends12mPerShare: number,
  targetYieldPercent: number | null,
  extraYields: number[] = [6, 8, 10]
): PriceTargetForYield[] {
  const yields = targetYieldPercent
    ? [targetYieldPercent, ...extraYields.filter((y) => y !== targetYieldPercent)]
    : extraYields;

  const unique = [...new Set(yields)].slice(0, 4);

  return unique
    .map((yieldAlvoPercent) => {
      const precoMaximo = maxPriceForTargetYield(dividends12mPerShare, yieldAlvoPercent);
      if (precoMaximo == null) return null;
      return {
        yieldAlvoPercent,
        precoMaximo: Math.round(precoMaximo * 100) / 100,
        proventos12mPorAcao: Math.round(dividends12mPerShare * 100) / 100,
        formula: `R$ ${dividends12mPerShare.toFixed(2)} ÷ ${yieldAlvoPercent}% = R$ ${precoMaximo.toFixed(2)}`,
      };
    })
    .filter((x): x is PriceTargetForYield => x != null);
}
