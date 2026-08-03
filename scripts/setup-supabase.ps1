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

# Link projeto (ref em supabase\.temp\project-ref)
$refFile = "supabase\.temp\project-ref"
if (-not (Test-Path $refFile)) {
  Write-Host "Projeto nao linkado. Execute primeiro:" -ForegroundColor Yellow
  Write-Host "  .\scripts\create-supabase-project.ps1" -ForegroundColor Yellow
  Write-Host "  ou .\scripts\link-supabase-manual.ps1" -ForegroundColor Yellow
  exit 1
}
$projectRef = (Get-Content $refFile -Raw).Trim()
$dbPassFile = "supabase\.temp\db-password.txt"
$linkArgs = @("link", "--project-ref", $projectRef)
if (Test-Path $dbPassFile) {
  $linkArgs += @("-p", (Get-Content $dbPassFile -Raw).Trim())
}
Write-Host "Linkando projeto $projectRef..."
npx supabase @linkArgs

# Aplicar migrations
Write-Host "Aplicando migrations..."
echo y | npx supabase db push

# Push config auth
Write-Host "Atualizando config de auth..."
echo y | npx supabase config push

Write-Host ""
Write-Host "Projeto: https://supabase.com/dashboard/project/$projectRef" -ForegroundColor Green
Write-Host "URL API: https://$projectRef.supabase.co" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: npm run dev" -ForegroundColor Cyan
Write-Host "Google OAuth: Dashboard > Authentication > Providers > Google" -ForegroundColor Yellow
