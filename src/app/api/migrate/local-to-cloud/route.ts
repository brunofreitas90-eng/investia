import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import { toSchemaAlertType } from '@/lib/alert-config';
import { mergePreferences } from '@/lib/user-preferences';
import type {
  Alert,
  FinancialGoal,
  Operation,
  PortfolioItem,
  UserPreferences,
  WatchlistItem,
} from '@/types';

/**
 * Sobe dados do aparelho (localStorage pessoal) para a conta na nuvem.
 * Não apaga o localStorage — só copia/mescla no Supabase.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Faça login na nuvem antes de sincronizar.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const portfolio = (body.portfolio ?? []) as PortfolioItem[];
    const watchlist = (body.watchlist ?? []) as WatchlistItem[];
    const alerts = (body.alerts ?? []) as Alert[];
    const operations = (body.operations ?? []) as Operation[];
    const goal = (body.goal ?? null) as FinancialGoal | null;
    const preferences = (body.preferences ?? null) as Partial<UserPreferences> | null;

    const supabase = await createClient();
    const counts = {
      portfolio: 0,
      watchlist: 0,
      alerts: 0,
      operations: 0,
      goal: 0,
      preferences: 0,
    };

    if (portfolio.length > 0) {
      const rows = portfolio.map((item) => ({
        user_id: user.id,
        ticker: String(item.ticker).toUpperCase(),
        asset_type: item.asset_type || 'stock_br',
        quantity: Number(item.quantity),
        average_price: Number(item.average_price),
        purchase_date: item.purchase_date,
        notes: item.notes ?? null,
      }));

      const { error, count } = await supabase.from('portfolio').upsert(rows, {
        onConflict: 'user_id,ticker,purchase_date',
        count: 'exact',
      });
      if (error) {
        return NextResponse.json(
          { error: `Carteira: ${error.message}` },
          { status: 500 }
        );
      }
      counts.portfolio = count ?? rows.length;
    }

    if (watchlist.length > 0) {
      const rows = watchlist.map((item) => ({
        user_id: user.id,
        ticker: String(item.ticker).toUpperCase(),
        asset_type: item.asset_type || 'stock_br',
        notes: item.notes ?? null,
      }));

      const { error, count } = await supabase.from('watchlist').upsert(rows, {
        onConflict: 'user_id,ticker',
        count: 'exact',
      });
      if (error) {
        return NextResponse.json(
          { error: `Watchlist: ${error.message}` },
          { status: 500 }
        );
      }
      counts.watchlist = count ?? rows.length;
    }

    if (alerts.length > 0) {
      const rows = alerts.map((a) => ({
        user_id: user.id,
        ticker: a.ticker ? String(a.ticker).toUpperCase() : null,
        alert_type: toSchemaAlertType(a.alert_type),
        condition: a.condition ?? {},
        is_active: a.is_active !== false,
        notify_email: Boolean(a.notify_email),
        notify_app: a.notify_app !== false,
      }));

      const { error, count } = await supabase.from('alerts').insert(rows, {
        count: 'exact',
      });
      if (error) {
        return NextResponse.json(
          { error: `Alertas: ${error.message}` },
          { status: 500 }
        );
      }
      counts.alerts = count ?? rows.length;
    }

    if (operations.length > 0) {
      const rows = operations.map((op) => ({
        user_id: user.id,
        ticker: String(op.ticker).toUpperCase(),
        operation_type: op.operation_type,
        quantity: Number(op.quantity),
        price: Number(op.price),
        total: Number(op.total ?? Number(op.quantity) * Number(op.price)),
        fees: Number(op.fees ?? 0),
        operation_date: op.operation_date,
        market: op.market || 'B3',
      }));

      const { error, count } = await supabase.from('operations').insert(rows, {
        count: 'exact',
      });
      if (error) {
        return NextResponse.json(
          { error: `Operações: ${error.message}` },
          { status: 500 }
        );
      }
      counts.operations = count ?? rows.length;
    }

    const profileUpdates: Record<string, unknown> = {};
    if (goal && (goal.targetAmount != null || goal.targetDate || goal.monthlyContribution != null)) {
      profileUpdates.financial_goal = goal;
      counts.goal = 1;
    }
    if (preferences) {
      profileUpdates.preferences = mergePreferences(preferences);
      counts.preferences = 1;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
      if (error) {
        return NextResponse.json(
          { error: `Perfil: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      counts,
      message: 'Dados deste aparelho sincronizados na nuvem. Cópia local mantida como backup.',
    });

    // Sai do modo "só neste navegador" para passar a usar a nuvem
    response.cookies.set('personal_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });

    return response;
  } catch {
    return NextResponse.json({ error: 'Falha ao sincronizar dados.' }, { status: 400 });
  }
}
