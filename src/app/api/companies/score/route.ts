import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { calculateCompanyAutoRating } from '@/lib/company-score';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { buildRIReport } from '@/services/market/ri-report';

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  const ticker = request.nextUrl.searchParams.get('ticker')?.trim();
  if (!ticker) {
    return NextResponse.json({ error: 'ticker obrigatório' }, { status: 400 });
  }

  try {
    const [ri, divHist] = await Promise.all([
      buildRIReport(ticker),
      buildDividendHistoryReport(ticker),
    ]);
    const rating = calculateCompanyAutoRating(
      ticker,
      ri,
      divHist?.analytics ?? null
    );
    return NextResponse.json(rating);
  } catch {
    return NextResponse.json({ error: 'Falha ao calcular nota' }, { status: 500 });
  }
}
