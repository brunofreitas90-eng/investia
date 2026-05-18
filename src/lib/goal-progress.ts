import { calculateCompoundInterest } from '@/lib/compound-interest';
import type { FinancialGoal } from '@/types';

export const RISK_ANNUAL_RATES: Record<
  NonNullable<FinancialGoal['riskProfile']>,
  number
> = {
  conservative: 8,
  moderate: 12,
  aggressive: 18,
};

export interface GoalProgressReport {
  goal: FinancialGoal;
  currentPatrimony: number;
  progressPercent: number;
  remainingAmount: number;
  monthsToTargetDate: number | null;
  daysToTargetDate: number | null;
  projectedAtTargetDate: number;
  onTrack: boolean;
  annualRatePercent: number;
  yearsToReachTarget: number | null;
  suggestion: string;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function getAnnualRateForGoal(goal: FinancialGoal): number {
  return RISK_ANNUAL_RATES[goal.riskProfile ?? 'moderate'];
}

export function estimateYearsToTarget(
  current: number,
  target: number,
  monthlyContribution: number,
  annualRatePercent: number,
  maxYears = 50
): number | null {
  if (target <= 0 || current >= target) return 0;
  for (let y = 1; y <= maxYears; y++) {
    const { finalAmount } = calculateCompoundInterest({
      initialAmount: current,
      monthlyContribution,
      annualRatePercent,
      years: y,
      frequency: 'monthly',
    });
    if (finalAmount >= target) return y;
  }
  return null;
}

export function buildGoalProgressReport(
  goal: FinancialGoal,
  currentPatrimony: number
): GoalProgressReport {
  const target = goal.targetAmount ?? 0;
  const monthly = goal.monthlyContribution ?? 0;
  const rate = getAnnualRateForGoal(goal);
  const now = new Date();

  const progressPercent =
    target > 0 ? Math.min(100, (currentPatrimony / target) * 100) : 0;
  const remainingAmount = Math.max(0, target - currentPatrimony);

  let monthsToTargetDate: number | null = null;
  let daysToTargetDate: number | null = null;
  let projectedAtTargetDate = currentPatrimony;
  let onTrack = false;

  if (goal.targetDate) {
    const end = new Date(goal.targetDate + 'T12:00:00');
    daysToTargetDate = Math.max(0, daysBetween(now, end));
    monthsToTargetDate = Math.max(0, Math.ceil(daysToTargetDate / 30));
    const yearsLeft = Math.max(0.08, daysToTargetDate / 365);
    const projection = calculateCompoundInterest({
      initialAmount: currentPatrimony,
      monthlyContribution: monthly,
      annualRatePercent: rate,
      years: yearsLeft,
      frequency: 'monthly',
    });
    projectedAtTargetDate = projection.finalAmount;
    onTrack = target <= 0 || projectedAtTargetDate >= target;
  }

  const yearsToReachTarget = estimateYearsToTarget(
    currentPatrimony,
    target,
    monthly,
    rate
  );

  let suggestion: string;
  if (target <= 0) {
    suggestion = 'Defina um valor alvo para acompanhar seu progresso.';
  } else if (currentPatrimony >= target) {
    suggestion = 'Parabéns! Você já atingiu a meta definida.';
  } else if (onTrack && goal.targetDate) {
    suggestion =
      'No ritmo atual de aportes e rentabilidade estimada, você está no caminho para bater a meta na data.';
  } else if (goal.targetDate && !onTrack) {
    const extra =
      monthly > 0
        ? ' Considere aumentar o aporte mensal ou estender o prazo.'
        : ' Defina um aporte mensal para acelerar o plano.';
    suggestion = `A projeção indica que você pode ficar abaixo da meta na data escolhida.${extra}`;
  } else if (yearsToReachTarget != null) {
    suggestion = `Mantendo os aportes, a meta pode ser atingida em cerca de ${yearsToReachTarget} ano(s) com perfil ${goal.riskProfile ?? 'moderate'}.`;
  } else {
    suggestion = 'Ajuste aporte, prazo ou perfil de risco para um plano viável.';
  }

  return {
    goal,
    currentPatrimony,
    progressPercent,
    remainingAmount,
    monthsToTargetDate,
    daysToTargetDate,
    projectedAtTargetDate,
    onTrack,
    annualRatePercent: rate,
    yearsToReachTarget,
    suggestion,
  };
}
