export type CompoundingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface CompoundInterestInput {
  initialAmount: number;
  monthlyContribution: number;
  annualRatePercent: number;
  years: number;
  frequency: CompoundingFrequency;
}

export interface CompoundInterestPoint {
  period: number;
  label: string;
  invested: number;
  interest: number;
  total: number;
}

export interface CompoundInterestResult {
  finalAmount: number;
  totalInvested: number;
  totalInterest: number;
  effectiveAnnualRate: number;
  timeline: CompoundInterestPoint[];
}

const PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const {
    initialAmount,
    monthlyContribution,
    annualRatePercent,
    years,
    frequency,
  } = input;

  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const totalPeriods = Math.max(1, Math.round(years * periodsPerYear));
  const ratePerPeriod = annualRatePercent / 100 / periodsPerYear;
  const contributionPerPeriod =
    frequency === 'monthly'
      ? monthlyContribution
      : monthlyContribution * (12 / periodsPerYear);

  const timeline: CompoundInterestPoint[] = [];
  let balance = Math.max(0, initialAmount);
  let totalInvested = Math.max(0, initialAmount);

  timeline.push({
    period: 0,
    label: 'Início',
    invested: totalInvested,
    interest: 0,
    total: balance,
  });

  for (let p = 1; p <= totalPeriods; p++) {
    balance = balance * (1 + ratePerPeriod) + contributionPerPeriod;
    totalInvested += contributionPerPeriod;

    const interest = balance - totalInvested;
    const year = p / periodsPerYear;

    if (p % periodsPerYear === 0 || p === totalPeriods) {
      timeline.push({
        period: p,
        label: `Ano ${year.toFixed(0)}`,
        invested: totalInvested,
        interest: Math.max(0, interest),
        total: balance,
      });
    }
  }

  const finalAmount = balance;
  const totalInterest = Math.max(0, finalAmount - totalInvested);
  const effectiveAnnualRate =
    years > 0 && totalInvested > 0
      ? (Math.pow(finalAmount / totalInvested, 1 / years) - 1) * 100
      : 0;

  return {
    finalAmount,
    totalInvested,
    totalInterest,
    effectiveAnnualRate,
    timeline,
  };
}
