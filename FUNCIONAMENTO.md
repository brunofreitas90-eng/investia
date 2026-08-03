# InvestIA — Guia completo

## Login na nuvem (email/senha) — configurar Supabase

O projeto antigo foi removido. Para ativar login real:

### Opção A — Automático (recomendado)

1. Crie um token em https://supabase.com/dashboard/account/tokens  
2. No PowerShell, na pasta do projeto:

```powershell
cd C:\Users\User\investia
$env:SUPABASE_ACCESS_TOKEN = "sbp_SEU_TOKEN_AQUI"
npm run supabase:setup
```

O script cria o projeto, aplica migrations, atualiza `.env.local`, Vercel e faz deploy.

### Opção B — Manual (database.new)

1. Abra https://database.new e crie o projeto **investia** (região São Paulo)  
2. Em **Settings → API**, copie URL, `anon` e `service_role`  
3. Em **Settings → Database**, copie a senha do Postgres  
4. Execute:

```powershell
.\scripts\link-supabase-manual.ps1 `
  -ProjectRef "SEU_REF" `
  -AnonKey "eyJ..." `
  -ServiceRoleKey "eyJ..." `
  -DbPassword "sua-senha"
```

### Verificar

```powershell
curl https://investia-nu.vercel.app/api/health
# authAvailable: true
```

Depois: https://investia-nu.vercel.app/register → criar conta → login.

---

## Modo demo (sem Supabase)

1. https://investia-nu.vercel.app/login  
2. **Entrar no modo demo**  
3. Dados salvos neste navegador/celular  

### Instalar no celular

- iPhone: Safari → Compartilhar → Adicionar à Tela de Início  
- Android: Chrome → Instalar app  
