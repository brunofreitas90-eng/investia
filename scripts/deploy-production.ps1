# InvestIA — Deploy produção (Vercel + Supabase)
# Uso: .\scripts\deploy-production.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== InvestIA — Deploy Producao ===" -ForegroundColor Cyan

if (-not (Test-Path .env.local)) {
  Write-Host "ERRO: .env.local nao encontrado. Copie .env.example e configure." -ForegroundColor Red
  exit 1
}

Write-Host "`n[1/6] Instalando dependencias..." -ForegroundColor Yellow
npm install

Write-Host "`n[2/6] Build de producao..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[3/6] Migrations Supabase..." -ForegroundColor Yellow
echo y | npx supabase db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Aviso: db push falhou. Verifique: npx supabase login" -ForegroundColor Yellow
}

Write-Host "`n[4/6] Sincronizando variaveis na Vercel..." -ForegroundColor Yellow
npx vercel link --yes 2>$null
$envFile = Get-Content .env.local -Raw
$lines = $envFile -split "`n"
foreach ($line in $lines) {
  $trimmed = $line.Trim()
  if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
  if ($trimmed -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $name = $matches[1]
    $value = $matches[2].Trim().Trim('"').Trim("'")
    if ($value -eq "") { continue }
    Write-Host "  -> $name" -ForegroundColor DarkGray
    $value | npx vercel env add $name production --force --yes 2>$null
  }
}

Write-Host "`n[5/6] Deploy Vercel (producao)..." -ForegroundColor Yellow
$deployOutput = npx vercel deploy --prod --yes 2>&1 | Out-String
Write-Host $deployOutput

$prodUrl = ($deployOutput | Select-String -Pattern 'https://[^\s]+\.vercel\.app' -AllMatches).Matches |
  ForEach-Object { $_.Value } |
  Select-Object -Last 1

if ($prodUrl) {
  Write-Host "`nURL de producao: $prodUrl" -ForegroundColor Green
  Write-Host "`n[6/6] Atualizando NEXT_PUBLIC_APP_URL..." -ForegroundColor Yellow
  $prodUrl | npx vercel env add NEXT_PUBLIC_APP_URL production --force --yes 2>$null

  Write-Host @"

Proximo passo manual no Supabase Dashboard:
  Authentication > URL Configuration
  - Site URL: $prodUrl
  - Redirect URLs: $prodUrl/auth/callback

Ou edite supabase/config.toml e rode: npx supabase config push

"@ -ForegroundColor Yellow
} else {
  Write-Host "`nDeploy concluido. Verifique a URL no painel Vercel." -ForegroundColor Yellow
}

Write-Host "`n=== Concluido ===" -ForegroundColor Green
