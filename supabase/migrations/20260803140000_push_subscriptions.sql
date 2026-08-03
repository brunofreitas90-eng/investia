-- Push subscriptions para notificações com o app fechado
create table if not exists public.push_subscriptions (
  device_id text primary key,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  tickers text[] not null default '{}',
  avg_prices jsonb not null default '{}'::jsonb,
  last_notified jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (enabled)
  where enabled = true;

alter table public.push_subscriptions enable row level security;

-- Acesso apenas via service role (API/cron). Sem policies para anon/authenticated.
