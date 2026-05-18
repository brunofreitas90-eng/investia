# Conecta repositorio GitHub ao projeto Vercel (investia)
# Pre-requisito: gh auth login
# Uso: .\scripts\connect-github-vercel.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$repoName = "investia"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$githubUser = if (Test-Path $gh) { & $gh api user -q .login } else { "brunofreitas90-eng" }

Write-Host "=== GitHub + Vercel ===" -ForegroundColor Cyan

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Faca login no GitHub CLI:" -ForegroundColor Yellow
  gh auth login -h github.com -p https -w
}

$status = git status --porcelain
if ($status) {
  git add -A
  git commit -m "chore: sync before GitHub connect" 2>$null
}

$remoteUrl = "https://github.com/$githubUser/$repoName.git"
$exists = gh repo view "$githubUser/$repoName" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Criando repositorio $githubUser/$repoName ..."
  gh repo create $repoName --public --source=. --remote=origin --push
} else {
  Write-Host "Repositorio ja existe. Configurando remote..."
  git remote remove origin 2>$null
  git remote add origin $remoteUrl
  git branch -M main
  git push -u origin main
}

Write-Host "Conectando Vercel ao GitHub..."
npx vercel git connect $remoteUrl --yes

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green
Write-Host "Repo: https://github.com/$githubUser/$repoName" -ForegroundColor Green
Write-Host "App:  https://investia-nu.vercel.app" -ForegroundColor Green
Write-Host ""
Write-Host "Deploys automaticos a cada push na branch main." -ForegroundColor Cyan
