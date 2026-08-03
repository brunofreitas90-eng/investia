import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { getQuote, getFundamentals } from '@/services/market';
import { buildRIReport } from '@/services/market/ri-report';
import { analyzeWithRI } from '@/services/ai/analyze-ri';

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const { ticker } = await request.json();
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker obrigatório' }, { status: 400 });
    }

    const t = ticker.toUpperCase().trim();

    const [quote, fundamentals, riReport] = await Promise.all([
      getQuote(t),
      getFundamentals(t),
      buildRIReport(t),
    ]);

    if (!riReport) {
      return NextResponse.json(
        { error: 'Não foi possível obter dados financeiros deste ativo. Verifique o ticker.' },
        { status: 404 }
      );
    }

    const analysis = await analyzeWithRI(
      t,
      riReport,
      (fundamentals ? { ...fundamentals } : {}) as Record<string, unknown>,
      quote
    );

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('[analyze]', err);
    return NextResponse.json({ error: 'Erro na análise' }, { status: 500 });
  }
}
