# Configura Web Push (VAPID + CRON) na Vercel Production
# Uso: powershell -ExecutionPolicy Bypass -File ./scripts/setup-push-vercel.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Gerando chaves VAPID..." -ForegroundColor Cyan
$tmp = Join-Path $env:TEMP "delfo-vapid-out.txt"
node scripts/generate-vapid-keys.mjs | Tee-Object -FilePath $tmp

$content = Get-Content $tmp -Raw
function Get-EnvValue([string]$name) {
  if ($content -match "(?m)^$name=(.+)$") { return $Matches[1].Trim() }
  return $null
}

$publicKey = Get-EnvValue "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
$privateKey = Get-EnvValue "VAPID_PRIVATE_KEY"
$subject = Get-EnvValue "VAPID_SUBJECT"
$cron = Get-EnvValue "CRON_SECRET"

if (-not $publicKey -or -not $privateKey -or -not $cron) {
  Write-Error "Falha ao ler chaves geradas."
}

if (-not $subject) { $subject = "mailto:delfo@investia.app" }

function Set-VercelEnv([string]$name, [string]$value) {
  Write-Host "Definindo $name ..." -ForegroundColor Yellow
  $value | npx vercel env add $name production --force | Out-Null
}

Set-VercelEnv "NEXT_PUBLIC_VAPID_PUBLIC_KEY" $publicKey
Set-VercelEnv "VAPID_PRIVATE_KEY" $privateKey
Set-VercelEnv "VAPID_SUBJECT" $subject
Set-VercelEnv "CRON_SECRET" $cron

Write-Host ""
Write-Host "Pronto. Agora:" -ForegroundColor Green
Write-Host "1) Rode o SQL: supabase/migrations/20260803140000_push_subscriptions.sql"
Write-Host "2) Deploy: npx vercel deploy --prod --yes"
Write-Host "3) No celular: Configurações → Ativar no celular"
Write-Host "4) (Opcional) GitHub secret CRON_SECRET = o mesmo valor gerado"
