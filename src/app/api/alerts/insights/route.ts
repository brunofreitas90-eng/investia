import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { generateSmartInsights } from '@/services/alerts/smart-insights';
import type { PortfolioItem } from '@/types';

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    let items = await resolvePortfolioItems();
    const ticker = request.nextUrl.searchParams.get('ticker');
    if (ticker) {
      items = items.filter((i) => i.ticker.toUpperCase() === ticker.toUpperCase());
    }
    const result = await generateSmartInsights(items);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar insights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const items = Array.isArray(body.portfolioItems)
      ? (body.portfolioItems as PortfolioItem[])
      : await resolvePortfolioItems();
    const result = await generateSmartInsights(items);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar insights' }, { status: 500 });
  }
}
