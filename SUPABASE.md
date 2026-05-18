# Supabase — InvestIA

## Projeto criado

| Campo | Valor |
|-------|--------|
| **Nome** | investia |
| **Região** | South America (São Paulo) |
| **Project Ref** | `inbiqonlnwjbcqdtdonk` |
| **Dashboard** | https://supabase.com/dashboard/project/inbiqonlnwjbcqdtdonk |
| **API URL** | https://inbiqonlnwjbcqdtdonk.supabase.co |

## O que já foi executado

1. `supabase projects create investia` — projeto criado
2. `supabase link --project-ref inbiqonlnwjbcqdtdonk` — projeto linkado
3. `supabase db push` — schema aplicado (12 tabelas + RLS + triggers)
4. `supabase config push` — URLs de redirect para `localhost:3000`
5. `.env.local` — chaves configuradas automaticamente

## Tabelas criadas

- `profiles`, `portfolio`, `operations`, `dividends`
- `watchlist`, `alerts`, `tax_records`, `financial_events`
- `price_history`, `chat_messages`, `company_analyses`, `api_cache`, `notifications`

## Comandos úteis (Windows)

```powershell
cd C:\Users\User\investia

# Reaplicar setup completo
.\scripts\setup-supabase.ps1

# Nova migration após alterar schema
npx supabase db push

# Ver status das migrations
npx supabase migration list

# Consultar banco remoto
npx supabase db query --linked --agent=no "SELECT count(*) FROM profiles;"
```

## Google Login (manual — 1 vez)

1. Abra: https://supabase.com/dashboard/project/inbiqonlnwjbcqdtdonk/auth/providers
2. Ative **Google**
3. Configure OAuth no [Google Cloud Console](https://console.cloud.google.com/)
4. Redirect URI: `https://inbiqonlnwjbcqdtdonk.supabase.co/auth/v1/callback`

## Produção (Vercel)

| Campo | Valor |
|-------|--------|
| **URL** | https://investia-nu.vercel.app |
| **Site URL (Auth)** | https://investia-nu.vercel.app |
| **Callback** | https://investia-nu.vercel.app/auth/callback |

Auth redirect já configurado via `supabase config push`.

## Reiniciar o app

```powershell
# Pare o servidor (Ctrl+C) e rode:
npm run dev
```

Acesse http://localhost:3000 → **Criar conta** ou **Login** (email/senha já funciona).

## Senha do banco (guardada na criação)

A senha do Postgres foi definida na criação do projeto. Para recuperar ou resetar:
Dashboard → **Project Settings** → **Database**.
