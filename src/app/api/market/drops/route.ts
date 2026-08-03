import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { popularTickers } from '@/lib/demo-data';
import { scanMarketDrops } from '@/services/radar/market-drops';

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  const useAI = request.nextUrl.searchParams.get('ai') !== '0';

  try {
    const result = await scanMarketDrops(popularTickers, useAI);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Falha ao escanear mercado' }, { status: 500 });
  }
}
