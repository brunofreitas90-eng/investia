const DEVICE_KEY = 'investia_push_device_id';
const ENABLED_KEY = 'investia_push_enabled';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function isPushEnabledLocally(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ENABLED_KEY) === '1';
}

export function setPushEnabledLocally(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.error('[push] SW register failed', err);
    return null;
  }
}

export type PushSupport = {
  supported: boolean;
  reason?: string;
};

export function checkPushSupport(): PushSupport {
  if (typeof window === 'undefined') return { supported: false, reason: 'SSR' };
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'Este navegador não suporte service worker.' };
  }
  if (!('PushManager' in window)) {
    return {
      supported: false,
      reason:
        'Push não suportado. No iPhone, adicione o app à Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início).',
    };
  }
  if (!('Notification' in window)) {
    return { supported: false, reason: 'API de notificação indisponível.' };
  }
  return { supported: true };
}

export async function enablePushNotifications(input: {
  tickers: string[];
  avgPrices?: Record<string, number>;
}): Promise<{ ok: boolean; error?: string }> {
  const support = checkPushSupport();
  if (!support.supported) return { ok: false, error: support.reason };

  const vapidRes = await fetch('/api/push/vapid', { cache: 'no-store' });
  const vapid = (await vapidRes.json()) as { configured?: boolean; publicKey?: string };
  if (!vapid.configured || !vapid.publicKey) {
    return {
      ok: false,
      error: 'Servidor ainda sem chaves VAPID. Configure e faça o deploy.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Permissão de notificação negada.' };
  }

  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, error: 'Falha ao registrar service worker.' };

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: 'Inscrição push incompleta.' };
  }

  const deviceId = getOrCreateDeviceId();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
      tickers: input.tickers,
      avgPrices: input.avgPrices,
      enabled: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || 'Falha ao ativar push.' };

  setPushEnabledLocally(true);
  return { ok: true };
}

export async function disablePushNotifications(): Promise<void> {
  const deviceId = getOrCreateDeviceId();
  try {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    /* ignore */
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* ignore */
  }

  setPushEnabledLocally(false);
}

export async function syncPushTickers(
  tickers: string[],
  avgPrices?: Record<string, number>
): Promise<void> {
  if (!isPushEnabledLocally()) return;
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;
  try {
    await fetch('/api/push/subscribe', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, tickers, avgPrices }),
    });
  } catch {
    /* ignore */
  }
}
