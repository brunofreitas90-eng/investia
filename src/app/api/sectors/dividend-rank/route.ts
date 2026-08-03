import { NextResponse } from 'next/server';
import { buildSectorDividendRanking } from '@/services/ranking/sector-dividend-rank';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const report = await buildSectorDividendRanking();
    return NextResponse.json(report);
  } catch (err) {
    console.error('[sectors/dividend-rank]', err);
    return NextResponse.json(
      { error: 'Falha ao montar ranking por setor' },
      { status: 500 }
    );
  }
}
