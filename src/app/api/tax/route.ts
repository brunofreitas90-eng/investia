import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { demoOperations } from '@/lib/demo-data';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { enrichPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/services/market';
import { buildTaxReport } from '@/lib/ir-tax';
import type { Operation } from '@/types';

async function buildReport(operations: Operation[], year?: number) {
  const items = await resolvePortfolioItems();
  const quotes = await getQuotes(items.map((i) => i.ticker));
  const enriched = enrichPortfolio(items, quotes);
  return buildTaxReport(operations, enriched, year ?? new Date().getFullYear());
}

export async function GET(request: NextRequest) {
  try {
    const year = parseInt(
      request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()),
      10
    );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(await buildReport(demoOperations, year));
    }

    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .eq('user_id', user.id)
      .order('operation_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(await buildReport(data || [], year));
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar IR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const year = body.year ?? new Date().getFullYear();

    if (Array.isArray(body.operations)) {
      return NextResponse.json(
        await buildReport(body.operations as Operation[], year)
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const {
      ticker,
      operation_type,
      quantity,
      price,
      fees,
      operation_date,
      market,
    } = body;

    if (!ticker || !operation_type || !quantity || !price || !operation_date) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    const fee = parseFloat(fees) || 0;

    const { error } = await supabase.from('operations').insert({
      user_id: user.id,
      ticker: String(ticker).toUpperCase(),
      operation_type,
      quantity: qty,
      price: prc,
      total: qty * prc,
      fees: fee,
      operation_date,
      market: market || 'B3',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: all } = await supabase
      .from('operations')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json(await buildReport(all || [], year));
  } catch {
    return NextResponse.json({ error: 'Falha ao registrar operação' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: all } = await supabase
      .from('operations')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json(await buildReport(all || []));
  } catch {
    return NextResponse.json({ error: 'Falha ao remover operação' }, { status: 500 });
  }
}
