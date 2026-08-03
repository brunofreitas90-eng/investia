import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { scanOpportunities, type RadarSource } from '@/services/radar/scan';
import type { OpportunityType } from '@/types';

const SOURCES: RadarSource[] = ['popular', 'portfolio', 'all'];
const TYPES: (OpportunityType | 'all')[] = [
  'all',
  'discounted',
  'high_dividend',
  'growth',
  'trending',
  'forgotten',
];

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  const source = (request.nextUrl.searchParams.get('source') || 'all') as RadarSource;
  const type = (request.nextUrl.searchParams.get('type') || 'all') as OpportunityType | 'all';

  if (!SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Fonte inválida' }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  try {
    const result = await scanOpportunities(source, type === 'all' ? undefined : type);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Falha ao escanear oportunidades' }, { status: 500 });
  }
}
