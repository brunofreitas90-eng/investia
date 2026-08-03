import type { DividendHistoryPayment, DividendPaymentKind } from '@/types';

export const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export interface PaymentScheduleInfo {
  paymentsLast12m: number;
  paymentsPerYear: number;
  frequency: string;
  typicalMonths: number[];
  typicalMonthLabels: string[];
  scheduleSummary: string;
}

export interface ForecastedPayment {
  kind: DividendPaymentKind;
  amountPerShare: number;
  paymentDate: string;
  /** Dia médio histórico usado na estimativa */
  typicalDay: number;
}

const FORECAST_KINDS: DividendPaymentKind[] = [
  'jcp',
  'dividendo',
  'rendimento',
];

function detectFrequencyLabel(count12m: number): string {
  if (count12m === 0) return 'Sem pagamentos recentes';
  if (count12m >= 10) return 'Mensal';
  if (count12m >= 4) return 'Trimestral';
  if (count12m >= 2) return 'Semestral';
  if (count12m === 1) return 'Anual';
  return 'Irregular';
}

/** Analisa padrão de pagamentos: vezes por ano e meses típicos */
export function analyzePaymentSchedule(
  payments: DividendHistoryPayment[]
): PaymentScheduleInfo {
  const paid = payments.filter((p) => p.paymentDate);
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const paymentsLast12m = paid.filter((p) => {
    const d = new Date(p.paymentDate! + 'T12:00:00');
    return d >= oneYearAgo && d <= now;
  }).length;

  const frequency = detectFrequencyLabel(paymentsLast12m);

  const byYear = new Map<number, number>();
  for (const p of paid) {
    const y = new Date(p.paymentDate! + 'T12:00:00').getFullYear();
    if (y >= now.getFullYear() - 3) {
      byYear.set(y, (byYear.get(y) ?? 0) + 1);
    }
  }

  const yearCounts = [...byYear.values()];
  const paymentsPerYear =
    yearCounts.length > 0
      ? Math.round(yearCounts.reduce((a, b) => a + b, 0) / yearCounts.length)
      : paymentsLast12m;

  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 3);

  const monthOccurrence = new Map<number, number>();
  const seenYearMonth = new Set<string>();

  for (const p of paid) {
    const d = new Date(p.paymentDate! + 'T12:00:00');
    if (d < cutoff) continue;
    const ym = `${d.getFullYear()}-${d.getMonth()}`;
    if (seenYearMonth.has(ym)) continue;
    seenYearMonth.add(ym);
    const month = d.getMonth() + 1;
    monthOccurrence.set(month, (monthOccurrence.get(month) ?? 0) + 1);
  }

  const yearsSpan = Math.max(1, byYear.size);
  const threshold = Math.max(1, Math.ceil(yearsSpan * 0.4));

  let typicalMonths: number[];

  if (frequency === 'Mensal' && paymentsLast12m >= 10) {
    typicalMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else {
    typicalMonths = [...monthOccurrence.entries()]
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => a[0] - b[0])
      .map(([m]) => m);

    if (typicalMonths.length === 0 && monthOccurrence.size > 0) {
      typicalMonths = [...monthOccurrence.entries()]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, Math.max(1, paymentsPerYear))
        .sort((a, b) => a[0] - b[0])
        .map(([m]) => m);
    } else if (typicalMonths.length > paymentsPerYear && paymentsPerYear > 0) {
      typicalMonths = [...monthOccurrence.entries()]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, paymentsPerYear)
        .sort((a, b) => a[0] - b[0])
        .map(([m]) => m);
    }
  }

  const typicalMonthLabels = typicalMonths.map((m) => MONTH_LABELS[m - 1]);

  let scheduleSummary: string;
  if (frequency === 'Mensal') {
    scheduleSummary = `${paymentsPerYear}x ao ano — pagamentos em todos os meses`;
  } else if (typicalMonthLabels.length > 0) {
    scheduleSummary = `${paymentsPerYear}x ao ano — costuma pagar em ${typicalMonthLabels.join(', ')}`;
  } else {
    scheduleSummary = `${paymentsPerYear}x ao ano — ${frequency.toLowerCase()}`;
  }

  return {
    paymentsLast12m,
    paymentsPerYear,
    frequency,
    typicalMonths,
    typicalMonthLabels,
    scheduleSummary,
  };
}

function yearMonthKey(iso: string): string {
  return iso.slice(0, 7);
}

function typicalPaymentDay(payments: DividendHistoryPayment[]): number {
  const days = payments
    .map((p) => {
      if (!p.paymentDate) return null;
      const d = new Date(p.paymentDate + 'T12:00:00');
      return Number.isNaN(d.getTime()) ? null : d.getDate();
    })
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b);

  if (days.length === 0) return 15;
  return days[Math.floor(days.length / 2)] ?? 15;
}

function avgAmountPerShare(payments: DividendHistoryPayment[]): number {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 3);

  const recent = payments.filter((p) => {
    if (!p.paymentDate || !(p.amountPerShare > 0)) return false;
    const d = new Date(p.paymentDate + 'T12:00:00');
    return d >= cutoff && d <= now;
  });

  const pool = recent.length > 0 ? recent : payments.filter((p) => p.amountPerShare > 0);
  if (pool.length === 0) return 0;
  return pool.reduce((s, p) => s + p.amountPerShare, 0) / pool.length;
}

/**
 * Prevê próximos proventos (inclui JCP/JSCP) com base nos meses típicos do histórico,
 * quando ainda não há anúncio oficial para aquele mês/tipo.
 */
export function forecastUpcomingPayments(
  payments: DividendHistoryPayment[],
  options?: {
    monthsAhead?: number;
    kinds?: DividendPaymentKind[];
  }
): ForecastedPayment[] {
  const monthsAhead = options?.monthsAhead ?? 14;
  const kinds = options?.kinds ?? FORECAST_KINDS;
  const now = new Date();
  const forecasts: ForecastedPayment[] = [];

  const announcedByKindMonth = new Set<string>();
  for (const p of payments) {
    if (!p.paymentDate) continue;
    const d = new Date(p.paymentDate + 'T12:00:00');
    if (Number.isNaN(d.getTime()) || d <= now) continue;
    announcedByKindMonth.add(`${p.kind}:${yearMonthKey(p.paymentDate)}`);
  }

  for (const kind of kinds) {
    const ofKind = payments.filter((p) => p.kind === kind && p.paymentDate);
    if (ofKind.length === 0) continue;

    const schedule = analyzePaymentSchedule(ofKind);
    if (schedule.typicalMonths.length === 0) continue;

    const avg = avgAmountPerShare(ofKind);
    if (!(avg > 0)) continue;

    const day = Math.min(28, Math.max(1, typicalPaymentDay(ofKind)));
    const typicalSet = new Set(schedule.typicalMonths);

    for (let i = 0; i <= monthsAhead; i++) {
      const cursor = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = cursor.getMonth() + 1;
      if (!typicalSet.has(month)) continue;

      const y = cursor.getFullYear();
      const m = String(month).padStart(2, '0');
      const paymentDate = `${y}-${m}-${String(day).padStart(2, '0')}`;
      const payment = new Date(paymentDate + 'T12:00:00');
      if (payment <= now) continue;

      const key = `${kind}:${yearMonthKey(paymentDate)}`;
      if (announcedByKindMonth.has(key)) continue;

      announcedByKindMonth.add(key);
      forecasts.push({
        kind,
        amountPerShare: Math.round(avg * 10000) / 10000,
        paymentDate,
        typicalDay: day,
      });
    }
  }

  return forecasts.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}
