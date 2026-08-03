import { createServiceClient } from '@/lib/supabase/server';
import {
  blobDeleteByEndpoint,
  blobListEnabled,
  blobUpdate,
  blobUpsert,
  isBlobStoreAvailable,
} from '@/lib/push/blob-store';
import type {
  PushSubscriptionKeys,
  PushSubscriptionRecord,
} from '@/lib/push/subscription-types';

export type { PushSubscriptionKeys, PushSubscriptionRecord };

function emptyRecord(deviceId: string): PushSubscriptionRecord {
  return {
    device_id: deviceId,
    endpoint: '',
    p256dh: '',
    auth: '',
    tickers: [],
    avg_prices: {},
    last_notified: {},
    enabled: true,
  };
}

const memoryStore = new Map<string, PushSubscriptionRecord>();

async function getDb() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    return createServiceClient();
  } catch {
    return null;
  }
}

export async function upsertPushSubscription(input: {
  deviceId: string;
  subscription: PushSubscriptionKeys;
  tickers?: string[];
  avgPrices?: Record<string, number>;
  enabled?: boolean;
}): Promise<{ ok: boolean; storage: 'supabase' | 'blob' | 'memory'; error?: string }> {
  const row: PushSubscriptionRecord = {
    device_id: input.deviceId,
    endpoint: input.subscription.endpoint,
    p256dh: input.subscription.keys.p256dh,
    auth: input.subscription.keys.auth,
    tickers: [...new Set((input.tickers ?? []).map((t) => t.toUpperCase()))],
    avg_prices: input.avgPrices ?? {},
    last_notified: {},
    enabled: input.enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    const existing = await db
      .from('push_subscriptions')
      .select('last_notified')
      .eq('device_id', input.deviceId)
      .maybeSingle();

    if (existing.data?.last_notified) {
      row.last_notified = existing.data.last_notified as Record<string, string>;
    }

    const { error } = await db.from('push_subscriptions').upsert(
      {
        device_id: row.device_id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        tickers: row.tickers,
        avg_prices: row.avg_prices,
        last_notified: row.last_notified,
        enabled: row.enabled,
        updated_at: row.updated_at,
      },
      { onConflict: 'device_id' }
    );

    if (!error) return { ok: true, storage: 'supabase' };
    // tabela ausente / projeto pausado → blob
    if (isBlobStoreAvailable()) {
      await blobUpsert(row);
      return { ok: true, storage: 'blob', error: error.message };
    }
    memoryStore.set(input.deviceId, {
      ...row,
      last_notified: memoryStore.get(input.deviceId)?.last_notified ?? {},
    });
    return { ok: true, storage: 'memory', error: error.message };
  }

  if (isBlobStoreAvailable()) {
    await blobUpsert(row);
    return { ok: true, storage: 'blob' };
  }

  const prev = memoryStore.get(input.deviceId);
  memoryStore.set(input.deviceId, {
    ...row,
    last_notified: prev?.last_notified ?? {},
  });
  return { ok: true, storage: 'memory' };
}

export async function syncDeviceTickers(
  deviceId: string,
  tickers: string[],
  avgPrices?: Record<string, number>
): Promise<boolean> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  const db = await getDb();
  if (db) {
    const { error } = await db
      .from('push_subscriptions')
      .update({
        tickers: unique,
        avg_prices: avgPrices ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);
    if (!error) return true;
  }

  if (isBlobStoreAvailable()) {
    return blobUpdate(deviceId, {
      tickers: unique,
      avg_prices: avgPrices ?? {},
      updated_at: new Date().toISOString(),
    });
  }

  const prev = memoryStore.get(deviceId);
  if (!prev) {
    memoryStore.set(deviceId, {
      ...emptyRecord(deviceId),
      tickers: unique,
      avg_prices: avgPrices ?? {},
    });
    return true;
  }
  memoryStore.set(deviceId, {
    ...prev,
    tickers: unique,
    avg_prices: avgPrices ?? prev.avg_prices,
    updated_at: new Date().toISOString(),
  });
  return true;
}

export async function disablePushSubscription(deviceId: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db
      .from('push_subscriptions')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('device_id', deviceId);
  }
  if (isBlobStoreAvailable()) {
    await blobUpdate(deviceId, { enabled: false, updated_at: new Date().toISOString() });
  }
  const prev = memoryStore.get(deviceId);
  if (prev) memoryStore.set(deviceId, { ...prev, enabled: false });
}

export async function deletePushByEndpoint(endpoint: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
  if (isBlobStoreAvailable()) {
    await blobDeleteByEndpoint(endpoint);
  }
  for (const [id, row] of memoryStore) {
    if (row.endpoint === endpoint) memoryStore.delete(id);
  }
}

export async function listEnabledSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const db = await getDb();
  if (db) {
    const { data, error } = await db
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true);

    if (!error && data && data.length > 0) {
      return data.map((r) => ({
        device_id: r.device_id,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
        tickers: (r.tickers as string[]) ?? [],
        avg_prices: (r.avg_prices as Record<string, number>) ?? {},
        last_notified: (r.last_notified as Record<string, string>) ?? {},
        enabled: Boolean(r.enabled),
        updated_at: r.updated_at,
      }));
    }
  }

  if (isBlobStoreAvailable()) {
    return blobListEnabled();
  }

  return [...memoryStore.values()].filter((r) => r.enabled && r.endpoint);
}

export async function markNotified(deviceId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const now = new Date().toISOString();
  const db = await getDb();

  let last: Record<string, string> = {};
  if (db) {
    const { data } = await db
      .from('push_subscriptions')
      .select('last_notified')
      .eq('device_id', deviceId)
      .maybeSingle();
    last = (data?.last_notified as Record<string, string>) ?? {};
  } else if (isBlobStoreAvailable()) {
    const all = await blobListEnabled();
    const found = all.find((r) => r.device_id === deviceId);
    last = { ...(found?.last_notified ?? {}) };
  } else {
    last = { ...(memoryStore.get(deviceId)?.last_notified ?? {}) };
  }

  for (const k of keys) last[k] = now;

  const cutoff = Date.now() - 14 * 86400000;
  for (const [k, v] of Object.entries(last)) {
    if (new Date(v).getTime() < cutoff) delete last[k];
  }

  if (db) {
    await db
      .from('push_subscriptions')
      .update({ last_notified: last, updated_at: now })
      .eq('device_id', deviceId);
  }

  if (isBlobStoreAvailable()) {
    await blobUpdate(deviceId, { last_notified: last, updated_at: now });
  }

  const prev = memoryStore.get(deviceId);
  if (prev) memoryStore.set(deviceId, { ...prev, last_notified: last });
}
