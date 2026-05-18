# Cria repo GitHub, faz push e conecta Vercel (requer login gh uma vez)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Host "Instale GitHub CLI: winget install GitHub.cli" -ForegroundColor Red
  exit 1
}

& $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Abrindo login GitHub no navegador..." -ForegroundColor Yellow
  Write-Host "Confirme o codigo em https://github.com/login/device" -ForegroundColor Cyan
  Start-Process "https://github.com/login/device"
  & $gh auth login -h github.com -p https -w
}

$login = & $gh api user -q .login
$repo = "$login/investia"
& $gh repo view $repo 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Criando repositorio $repo ..."
  git branch -M main
  & $gh repo create investia --public --source=. --remote=origin --push
} else {
  Write-Host "Repositorio existe. Enviando codigo..."
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$repo.git"
  git branch -M main
  git push -u origin main --force
}

Write-Host "Conectando Vercel ao GitHub..."
npx vercel git connect "https://github.com/$repo.git" --yes
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Git nativo na Vercel falhou (instale o app em https://github.com/apps/vercel na conta $login)." -ForegroundColor Yellow
  Write-Host "Configurando deploy automatico via GitHub Actions..." -ForegroundColor Yellow
  $vercelAuth = "$env:APPDATA\xdg.data\com.vercel.cli\auth.json"
  if (Test-Path $vercelAuth) {
    $vt = (Get-Content $vercelAuth | ConvertFrom-Json).token
    $vt | & $gh secret set VERCEL_TOKEN 2>$null
    Write-Host "Secret VERCEL_TOKEN configurado no GitHub." -ForegroundColor Green
  }
  Write-Host "Push em main dispara: .github/workflows/vercel-production.yml" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Pronto! Repo: https://github.com/$repo" -ForegroundColor Green
Write-Host "App:   https://investia-nu.vercel.app" -ForegroundColor Green
Write-Host "CI:    https://github.com/$repo/actions" -ForegroundColor Green
