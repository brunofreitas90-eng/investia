import { NextRequest, NextResponse } from 'next/server';
import {
  listEnabledSubscriptions,
  markNotified,
} from '@/lib/push/subscriptions';
import { sendPushToSubscription } from '@/lib/push/send';
import { isPushConfigured } from '@/lib/push/vapid';
import { scanRelevantEvents } from '@/services/push/scan-relevant';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Em desenvolvimento permite sem secret
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-cron-secret');
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({
      ok: false,
      reason: 'push_not_configured',
      sent: 0,
    });
  }

  const subs = await listEnabledSubscriptions();
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const samples: string[] = [];

  for (const sub of subs) {
    if (!sub.tickers?.length) {
      skipped += 1;
      continue;
    }

    try {
      const events = await scanRelevantEvents({
        tickers: sub.tickers,
        avgPrices: sub.avg_prices,
        alreadyNotified: sub.last_notified,
      });

      if (events.length === 0) {
        skipped += 1;
        continue;
      }

      const notifiedKeys: string[] = [];
      for (const ev of events) {
        const result = await sendPushToSubscription(sub, {
          title: ev.title,
          body: ev.body,
          url: ev.url,
          tag: ev.tag,
        });
        if (result === 'sent') {
          sent += 1;
          notifiedKeys.push(ev.key);
          if (samples.length < 8) samples.push(ev.title);
        } else if (result === 'error') {
          errors += 1;
        }
      }

      if (notifiedKeys.length) {
        await markNotified(sub.device_id, notifiedKeys);
      }
    } catch (err) {
      console.error('[cron/notifications] device failed', sub.device_id, err);
      errors += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    devices: subs.length,
    sent,
    skipped,
    errors,
    samples,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
