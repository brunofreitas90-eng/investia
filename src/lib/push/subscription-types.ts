export interface PushSubscriptionRecord {
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  tickers: string[];
  avg_prices: Record<string, number>;
  last_notified: Record<string, string>;
  enabled: boolean;
  updated_at?: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
