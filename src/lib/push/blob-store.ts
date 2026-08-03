/**
 * Armazenamento durável via Vercel Blob (quando BLOB_READ_WRITE_TOKEN existir).
 * Usado como fallback se o Supabase estiver pausado/indisponível.
 */
import type { PushSubscriptionRecord } from '@/lib/push/subscription-types';

const BLOB_PATH = 'push/subscriptions.json';
const memory = new Map<string, PushSubscriptionRecord>();

export function isBlobStoreAvailable(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(merged);
}

async function readAll(): Promise<Record<string, PushSubscriptionRecord>> {
  if (!isBlobStoreAvailable()) {
    const out: Record<string, PushSubscriptionRecord> = {};
    for (const [k, v] of memory) out[k] = v;
    return out;
  }

  try {
    const { get } = await import('@vercel/blob');
    const result = await get(BLOB_PATH, {
      access: 'private',
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!result || result.statusCode !== 200 || !result.stream) return {};
    const text = await streamToText(result.stream);
    if (!text.trim()) return {};
    return JSON.parse(text) as Record<string, PushSubscriptionRecord>;
  } catch (err) {
    // arquivo ainda não existe
    console.warn('[push-blob] read empty/missing', err);
    return {};
  }
}

async function writeAll(data: Record<string, PushSubscriptionRecord>): Promise<boolean> {
  if (!isBlobStoreAvailable()) {
    memory.clear();
    for (const [k, v] of Object.entries(data)) memory.set(k, v);
    return true;
  }

  try {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(data), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return true;
  } catch (err) {
    console.error('[push-blob] write failed', err);
    return false;
  }
}

export async function blobUpsert(record: PushSubscriptionRecord): Promise<boolean> {
  const all = await readAll();
  const prev = all[record.device_id];
  all[record.device_id] = {
    ...record,
    last_notified:
      Object.keys(record.last_notified ?? {}).length > 0
        ? record.last_notified
        : (prev?.last_notified ?? {}),
  };
  return writeAll(all);
}

export async function blobUpdate(
  deviceId: string,
  patch: Partial<PushSubscriptionRecord>
): Promise<boolean> {
  const all = await readAll();
  const prev = all[deviceId];
  if (!prev) {
    all[deviceId] = {
      device_id: deviceId,
      endpoint: '',
      p256dh: '',
      auth: '',
      tickers: [],
      avg_prices: {},
      last_notified: {},
      enabled: true,
      ...patch,
    };
  } else {
    all[deviceId] = { ...prev, ...patch, device_id: deviceId };
  }
  return writeAll(all);
}

export async function blobDeleteByEndpoint(endpoint: string): Promise<void> {
  const all = await readAll();
  let changed = false;
  for (const [id, row] of Object.entries(all)) {
    if (row.endpoint === endpoint) {
      delete all[id];
      changed = true;
    }
  }
  if (changed) await writeAll(all);
}

export async function blobListEnabled(): Promise<PushSubscriptionRecord[]> {
  const all = await readAll();
  return Object.values(all).filter((r) => r.enabled && r.endpoint);
}
