import { NextRequest, NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api-guard';
import { isDemoRequest } from '@/lib/demo-mode';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import { demoFinancialGoal } from '@/lib/demo-data';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { enrichPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/services/market';
import { buildGoalProgressReport } from '@/lib/goal-progress';
import type { FinancialGoal } from '@/types';

async function patrimonyFromPortfolio() {
  const items = await resolvePortfolioItems();
  const quotes = await getQuotes(items.map((i) => i.ticker));
  const enriched = enrichPortfolio(items, quotes);
  return enriched.reduce((sum, i) => sum + (i.current_value ?? 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    if (isDemoRequest(request)) {
      return unauthorized();
    }

    const user = await getAuthUser();
    if (!user) {
      return unauthorized();
    }

    const currentPatrimony = await patrimonyFromPortfolio();
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('financial_goal')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const goal = (profile?.financial_goal as FinancialGoal) || {};
    const merged: FinancialGoal = {
      ...demoFinancialGoal,
      ...goal,
    };

    return NextResponse.json(buildGoalProgressReport(merged, currentPatrimony));
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar metas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.preview === true) {
      const goal = body.goal as FinancialGoal;
      const currentPatrimony =
        typeof body.currentPatrimony === 'number'
          ? body.currentPatrimony
          : await patrimonyFromPortfolio();
      return NextResponse.json(buildGoalProgressReport(goal, currentPatrimony));
    }

    const user = await getAuthUser();
    if (!user) {
      return unauthorized();
    }

    const supabase = await createClient();

    const goal: FinancialGoal = {
      targetAmount: body.targetAmount != null ? Number(body.targetAmount) : undefined,
      targetDate: body.targetDate || undefined,
      monthlyContribution:
        body.monthlyContribution != null
          ? Number(body.monthlyContribution)
          : undefined,
      riskProfile: body.riskProfile || 'moderate',
    };

    const { error } = await supabase
      .from('profiles')
      .update({ financial_goal: goal })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentPatrimony = await patrimonyFromPortfolio();
    return NextResponse.json(buildGoalProgressReport(goal, currentPatrimony));
  } catch {
    return NextResponse.json({ error: 'Falha ao salvar meta' }, { status: 500 });
  }
}
