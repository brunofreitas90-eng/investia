# InvestIA

SaaS moderno de análise inteligente de investimentos em ações brasileiras e americanas.

## Stack

- **Frontend:** Next.js 15+, TypeScript, TailwindCSS, Shadcn/UI, Framer Motion, Recharts
- **Backend:** Supabase (auth + database)
- **IA:** OpenAI API
- **Deploy:** Vercel

## Funcionalidades

- Dashboard com patrimônio, lucro/prejuízo e evolução
- Carteira (ações BR/US, FIIs, ETFs)
- Controle de dividendos e calendário
- Imposto de renda (DARF, isenção 20k)
- IA analista de empresas
- Radar de oportunidades
- Alertas, watchlist, chat IA
- Simuladores, metas e ranking

## Setup

```bash
npm install
cp .env.example .env.local
# Configure Supabase e OpenAI em .env.local
```

### Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute `supabase/schema.sql` no SQL Editor
3. Ative Google OAuth em Authentication > Providers
4. Copie URL e anon key para `.env.local`

### Variáveis

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon |
| `OPENAI_API_KEY` | Chave OpenAI para IA |
| `BRAPI_TOKEN` | Opcional — mais requests na Brapi |

## Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Sem Supabase configurado, o app funciona em **modo demo**.

## Deploy (Vercel)

**Produção:** https://investia-nu.vercel.app

```powershell
# Setup completo (build + Supabase + Vercel)
.\scripts\deploy-production.ps1

# Ou manualmente:
npm run build
npx supabase db push
npx vercel deploy --prod --yes
```

Variáveis obrigatórias na Vercel (Production):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://investia-nu.vercel.app`
- `OPENAI_API_KEY` (para Chat IA e Análise — adicione no painel Vercel se vazio no `.env.local`)

## APIs de mercado (gratuitas)

- Brapi (ações BR)
- Yahoo Finance (BR + US)
- Fallback automático entre fontes
- Cache em memória anti-rate-limit

## Estrutura

```
src/
├── app/           # Rotas e páginas
├── components/    # UI e layout
├── services/      # Market data e IA
├── lib/           # Utils, Supabase, portfolio
├── types/         # TypeScript
└── store/         # Zustand
```
