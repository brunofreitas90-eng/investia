import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { compareRIReports } from '@/services/ai/ri-comparison';

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const ticker = (body.ticker as string)?.trim();
    if (!ticker) {
      return NextResponse.json({ error: 'ticker obrigatório' }, { status: 400 });
    }

    const report = await compareRIReports(ticker);
    if (!report) {
      return NextResponse.json({ error: 'Não foi possível comparar resultados' }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: 'Falha na comparação de RI' }, { status: 500 });
  }
}
