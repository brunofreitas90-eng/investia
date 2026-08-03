import { configureWebPush, webpush } from '@/lib/push/vapid';
import {
  deletePushByEndpoint,
  type PushSubscriptionRecord,
} from '@/lib/push/subscriptions';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToSubscription(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<'sent' | 'gone' | 'error'> {
  if (!configureWebPush()) return 'error';

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? '/alertas',
        tag: payload.tag ?? 'delfo',
      }),
      { TTL: 60 * 60 * 12, urgency: 'normal' }
    );
    return 'sent';
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      await deletePushByEndpoint(sub.endpoint);
      return 'gone';
    }
    console.error('[push] send failed', err);
    return 'error';
  }
}
