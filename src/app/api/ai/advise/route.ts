import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { generateInvestmentAdvice } from '@/services/ai/investment-advisor';
import type { PortfolioItem } from '@/types';

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const capitalAvailable = Number(body.capitalAvailable);

    if (!capitalAvailable || capitalAvailable <= 0) {
      return NextResponse.json(
        { error: 'Informe o valor disponível para investir' },
        { status: 400 }
      );
    }

    let items: PortfolioItem[];
    if (Array.isArray(body.portfolioItems) && body.portfolioItems.length > 0) {
      items = body.portfolioItems as PortfolioItem[];
    } else {
      items = await resolvePortfolioItems();
    }

    const report = await generateInvestmentAdvice(capitalAvailable, items);
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar recomendações' }, { status: 500 });
  }
}
