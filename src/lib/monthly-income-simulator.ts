import type { MonthlyIncomeSimulation } from '@/types';
import { popularTickers } from '@/lib/demo-data';

export interface MonthlyIncomeInput {
  capitalAvailable: number;
  monthlyGoal: number;
  monthsToGoal?: number;
  monthlyContribution?: number;
}

const DEFAULT_YIELDS: Record<string, { yield: number; name: string }> = {
  PETR4: { yield: 12, name: 'Petrobras' },
  VALE3: { yield: 8, name: 'Vale' },
  ITUB4: { yield: 5.5, name: 'Itaú' },
  BBDC4: { yield: 6, name: 'Bradesco' },
  WEGE3: { yield: 1.2, name: 'WEG' },
  MXRF11: { yield: 11, name: 'MXRF11' },
  HGLG11: { yield: 9.5, name: 'HGLG11' },
  BOVA11: { yield: 0.5, name: 'BOVA11' },
};

export function simulateMonthlyIncome(input: MonthlyIncomeInput): MonthlyIncomeSimulation {
  const {
    capitalAvailable,
    monthlyGoal,
    monthsToGoal = 120,
    monthlyContribution = 0,
  } = input;

  const avgYield = 0.08;
  const capitalNeeded = monthlyGoal > 0 ? (monthlyGoal * 12) / avgYield : 0;

  let patrimony = capitalAvailable;
  let months = 0;
  const maxMonths = Math.min(monthsToGoal, 360);

  while (patrimony < capitalNeeded && months < maxMonths) {
    patrimony += monthlyContribution;
    patrimony *= 1 + avgYield / 12;
    months += 1;
  }

  const estimatedYears = months / 12;

  const picks = popularTickers
    .filter((t) => DEFAULT_YIELDS[t])
    .slice(0, 5)
    .map((ticker, i, arr) => {
      const meta = DEFAULT_YIELDS[ticker]!;
      const weightPercent = Math.round(100 / arr.length);
      const alloc = (capitalAvailable * weightPercent) / 100;
      const annual = alloc * (meta.yield / 100);
      return {
        ticker,
        name: meta.name,
        weightPercent,
        dividendYield: meta.yield,
        monthlyIncomeEstimate: annual / 12,
      };
    });

  const monthlyProjection: MonthlyIncomeSimulation['monthlyProjection'] = [];
  let p = capitalAvailable;
  const now = new Date();
  for (let i = 0; i < Math.min(24, maxMonths); i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    p += monthlyContribution;
    const income = (p * avgYield) / 12;
    p += income * 0.3;
    monthlyProjection.push({
      month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      income: Math.round(income * 100) / 100,
      patrimony: Math.round(p),
    });
  }

  const currentIncome = (capitalAvailable * avgYield) / 12;

  return {
    capitalAvailable,
    monthlyGoal,
    monthsToGoal: months,
    capitalNeeded: Math.round(capitalNeeded),
    estimatedYears: Math.round(estimatedYears * 10) / 10,
    suggestedPortfolio: picks,
    monthlyProjection,
    risks: [
      'Dividendos podem ser cortados em crises setoriais.',
      'Preços das ações oscilam — o patrimônio pode cair temporariamente.',
      'Yield passado não garante yield futuro.',
      'Diversifique entre setores e tipos de ativos (ações, FIIs).',
    ],
    explanation: buildExplanation(
      monthlyGoal,
      capitalNeeded,
      capitalAvailable,
      currentIncome,
      estimatedYears
    ),
  };
}

function buildExplanation(
  goal: number,
  needed: number,
  available: number,
  currentIncome: number,
  years: number
): string {
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (goal <= 0) {
    return 'Informe um objetivo de renda mensal para simular.';
  }

  const parts = [
    `Para receber cerca de ${fmt(goal)}/mês em dividendos (yield médio ~8% a.a.), você precisaria de aproximadamente ${fmt(needed)} investidos.`,
    `Hoje, com ${fmt(available)}, a renda mensal estimada seria ${fmt(currentIncome)}.`,
  ];

  if (available < needed) {
    parts.push(
      `Com aportes regulares, a meta pode ser atingida em cerca de ${years.toFixed(1)} anos (projeção simplificada).`
    );
  } else {
    parts.push('Seu capital já cobre o objetivo na projeção — revise a carteira para diversificar.');
  }

  return parts.join(' ');
}
