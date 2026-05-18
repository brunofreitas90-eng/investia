import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/services/market';

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker obrigatório' }, { status: 400 });
  }

  const quote = await getQuote(ticker);
  if (!quote) {
    return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 });
  }

  return NextResponse.json(quote);
}
