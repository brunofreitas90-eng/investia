import { NextRequest, NextResponse } from 'next/server';
import { isPushConfigured } from '@/lib/push/vapid';
import {
  disablePushSubscription,
  syncDeviceTickers,
  upsertPushSubscription,
} from '@/lib/push/subscriptions';

type Body = {
  deviceId?: string;
  subscription?: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  tickers?: string[];
  avgPrices?: Record<string, number>;
  enabled?: boolean;
};

export async function POST(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error:
          'Notificações push não configuradas no servidor (VAPID). Configure as variáveis e faça o deploy.',
        code: 'PUSH_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Body;
    const deviceId = String(body.deviceId ?? '').trim();
    if (!deviceId || !body.subscription?.endpoint || !body.subscription.keys?.p256dh) {
      return NextResponse.json({ error: 'Dados de inscrição inválidos.' }, { status: 400 });
    }

    const result = await upsertPushSubscription({
      deviceId,
      subscription: body.subscription,
      tickers: body.tickers,
      avgPrices: body.avgPrices,
      enabled: body.enabled ?? true,
    });

    return NextResponse.json({
      ok: true,
      storage: result.storage,
      warning: result.error,
    });
  } catch {
    return NextResponse.json({ error: 'Falha ao salvar inscrição.' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const deviceId = String(body.deviceId ?? '').trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId obrigatório' }, { status: 400 });
    }

    await syncDeviceTickers(deviceId, body.tickers ?? [], body.avgPrices);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Falha ao sincronizar tickers.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const deviceId = String(body.deviceId ?? '').trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId obrigatório' }, { status: 400 });
    }
    await disablePushSubscription(deviceId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Falha ao desativar.' }, { status: 400 });
  }
}
