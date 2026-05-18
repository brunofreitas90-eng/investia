# InvestIA — Setup Supabase (Windows PowerShell)
# Uso: .\scripts\setup-supabase.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== InvestIA Supabase Setup ===" -ForegroundColor Cyan

# Copiar env se nao existir
if (-not (Test-Path .env.local)) {
  Copy-Item .env.example .env.local
  Write-Host "Criado .env.local a partir de .env.example" -ForegroundColor Green
}

# Verificar login CLI
npx supabase projects list | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Execute: npx supabase login" -ForegroundColor Yellow
  exit 1
}

# Link projeto (se ainda nao linkado)
if (-not (Test-Path "supabase\.temp\project-ref")) {
  Write-Host "Linkando projeto inbiqonlnwjbcqdtdonk..."
  npx supabase link --project-ref inbiqonlnwjbcqdtdonk
}

# Aplicar migrations
Write-Host "Aplicando migrations..."
echo y | npx supabase db push

# Push config auth
Write-Host "Atualizando config de auth..."
echo y | npx supabase config push

Write-Host ""
Write-Host "Projeto: https://supabase.com/dashboard/project/inbiqonlnwjbcqdtdonk" -ForegroundColor Green
Write-Host "URL API: https://inbiqonlnwjbcqdtdonk.supabase.co" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: npm run dev" -ForegroundColor Cyan
Write-Host "Google OAuth: Dashboard > Authentication > Providers > Google" -ForegroundColor Yellow
