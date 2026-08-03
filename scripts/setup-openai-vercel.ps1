# Configura OPENAI_API_KEY local + Vercel producao
# Uso: .\scripts\setup-openai-vercel.ps1 -ApiKey "sk-..."

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiKey
)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..

$key = $ApiKey.Trim()
if ($key.Length -lt 20) {
  Write-Host "ERRO: ApiKey invalida." -ForegroundColor Red
  exit 1
}

Write-Host "=== DelfoInvestIA - OpenAI ===" -ForegroundColor Cyan

# .env.local
$envPath = ".env.local"
$lines = @()
if (Test-Path $envPath) {
  $lines = Get-Content $envPath | Where-Object {
    $_ -notmatch '^\s*OPENAI_API_KEY\s*='
  }
}
$lines += "OPENAI_API_KEY=$key"
$lines | Set-Content $envPath -Encoding utf8
Write-Host "[OK] .env.local atualizado" -ForegroundColor Green

# Vercel
Write-Host "[...] Enviando para Vercel (production)..." -ForegroundColor Yellow
npx vercel link --yes 2>$null | Out-Null
$key | npx vercel env add OPENAI_API_KEY production --force --yes 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Aviso: vercel env add falhou. Tente manualmente no painel Vercel." -ForegroundColor Yellow
} else {
  Write-Host "[OK] OPENAI_API_KEY na Vercel" -ForegroundColor Green
}

Write-Host ""
Write-Host "Proximo passo: redeploy para aplicar" -ForegroundColor Yellow
Write-Host "  npx vercel deploy --prod --yes" -ForegroundColor Yellow
Write-Host ""
Write-Host "Teste: https://investia-nu.vercel.app/api/health  (openai: true)" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Concluido ===" -ForegroundColor Green
