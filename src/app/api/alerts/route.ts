import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { demoAlerts } from '@/lib/demo-data';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { buildCondition, toSchemaAlertType } from '@/lib/alert-config';
import { evaluateAlerts } from '@/services/alerts/evaluate';
import type { Alert, AlertType } from '@/types';

async function enrichAlerts(alerts: Alert[], portfolioItems: Awaited<ReturnType<typeof resolvePortfolioItems>>) {
  const evaluated = await evaluateAlerts(alerts, portfolioItems);
  const triggeredCount = evaluated.filter((a) => a.triggered).length;
  return { alerts: evaluated, triggeredCount, total: evaluated.length };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const portfolioItems = await resolvePortfolioItems();

    if (!user) {
      return NextResponse.json(await enrichAlerts(demoAlerts, portfolioItems));
    }

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const alerts = (data || []).map((row) => ({
      ...row,
      alert_type: normalizeRowType(row.alert_type, row.condition),
    })) as Alert[];

    return NextResponse.json(await enrichAlerts(alerts, portfolioItems));
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar alertas' }, { status: 500 });
  }
}

function normalizeRowType(
  schemaType: string,
  condition: Record<string, unknown>
): AlertType {
  if (schemaType === 'price_target' && condition?.direction === 'below') {
    return 'price_drop';
  }
  return schemaType as AlertType;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body.alerts)) {
      const portfolioItems = await resolvePortfolioItems();
      return NextResponse.json(
        await enrichAlerts(body.alerts as Alert[], portfolioItems)
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const alertType = body.alert_type as AlertType;
    const condition = buildCondition(alertType, {
      targetPrice: body.targetPrice,
      percent: body.percent,
      daysBefore: body.daysBefore,
    });

    const { error } = await supabase.from('alerts').insert({
      user_id: user.id,
      ticker: body.ticker ? String(body.ticker).toUpperCase() : null,
      alert_type: toSchemaAlertType(alertType),
      condition,
      is_active: body.is_active ?? true,
      notify_email: body.notify_email ?? true,
      notify_app: body.notify_app ?? true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const portfolioItems = await resolvePortfolioItems();
    const { data: all } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id);

    const alerts = (all || []).map((row) => ({
      ...row,
      alert_type: normalizeRowType(row.alert_type, row.condition),
    })) as Alert[];

    return NextResponse.json(await enrichAlerts(alerts, portfolioItems));
  } catch {
    return NextResponse.json({ error: 'Falha ao criar alerta' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id, is_active } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const { error } = await supabase
      .from('alerts')
      .update({ is_active: Boolean(is_active) })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const portfolioItems = await resolvePortfolioItems();
    const { data: all } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id);

    const alerts = (all || []).map((row) => ({
      ...row,
      alert_type: normalizeRowType(row.alert_type, row.condition),
    })) as Alert[];

    return NextResponse.json(await enrichAlerts(alerts, portfolioItems));
  } catch {
    return NextResponse.json({ error: 'Falha ao atualizar alerta' }, { status: 500 });
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
      .from('alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const portfolioItems = await resolvePortfolioItems();
    const { data: all } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id);

    const alerts = (all || []).map((row) => ({
      ...row,
      alert_type: normalizeRowType(row.alert_type, row.condition),
    })) as Alert[];

    return NextResponse.json(await enrichAlerts(alerts, portfolioItems));
  } catch {
    return NextResponse.json({ error: 'Falha ao remover alerta' }, { status: 500 });
  }
}
