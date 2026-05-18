import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mergePreferences } from '@/lib/user-preferences';
import type { SettingsPayload, UserPreferences } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const payload: SettingsPayload = {
        isDemo: true,
        email: 'demo@investia.app',
        fullName: 'Visitante Demo',
        avatarUrl: null,
        preferences: mergePreferences(),
      };
      return NextResponse.json(payload);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, preferences, created_at')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payload: SettingsPayload = {
      isDemo: false,
      email: user.email ?? '',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      preferences: mergePreferences(
        (profile?.preferences as Partial<UserPreferences>) ?? undefined
      ),
      memberSince: profile?.created_at,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (body.preview === true) {
        const payload: SettingsPayload = {
          isDemo: true,
          email: 'demo@investia.app',
          fullName: body.fullName ?? 'Visitante Demo',
          avatarUrl: null,
          preferences: mergePreferences(body.preferences),
        };
        return NextResponse.json(payload);
      }
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) {
      updates.full_name = String(body.fullName).trim() || null;
    }
    if (body.preferences) {
      updates.preferences = mergePreferences(body.preferences);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, preferences, created_at')
      .eq('id', user.id)
      .single();

    const payload: SettingsPayload = {
      isDemo: false,
      email: user.email ?? '',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      preferences: mergePreferences(
        (profile?.preferences as Partial<UserPreferences>) ?? undefined
      ),
      memberSince: profile?.created_at,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Falha ao salvar configurações' }, { status: 500 });
  }
}
