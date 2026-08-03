import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { simulateMonthlyIncome } from '@/lib/monthly-income-simulator';

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const capitalAvailable = Number(body.capitalAvailable) || 0;
    const monthlyGoal = Number(body.monthlyGoal) || 0;
    const monthsToGoal = Number(body.monthsToGoal) || 120;
    const monthlyContribution = Number(body.monthlyContribution) || 0;

    if (monthlyGoal <= 0) {
      return NextResponse.json({ error: 'Objetivo mensal deve ser maior que zero' }, { status: 400 });
    }

    const result = simulateMonthlyIncome({
      capitalAvailable,
      monthlyGoal,
      monthsToGoal,
      monthlyContribution,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Falha na simulação' }, { status: 500 });
  }
}
