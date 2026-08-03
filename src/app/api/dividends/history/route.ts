import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  const ticker = request.nextUrl.searchParams.get('ticker')?.trim();
  if (!ticker) {
    return NextResponse.json({ error: 'ticker obrigatório' }, { status: 400 });
  }

  try {
    const report = await buildDividendHistoryReport(ticker);
    if (!report) {
      return NextResponse.json({ error: 'Dados não encontrados para o ticker' }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar histórico' }, { status: 500 });
  }
}
