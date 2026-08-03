# InvestIA - Cria projeto Supabase + env + Vercel + migrations
param(
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [string]$ProjectName = "investia",
  [string]$Region = "sa-east-1",
  [string]$AppUrl = "https://investia-nu.vercel.app"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function Get-SupabaseToken {
  if ($AccessToken) { return $AccessToken }
  if ($env:SUPABASE_ACCESS_TOKEN) { return $env:SUPABASE_ACCESS_TOKEN }
  $cliTokenPath = Join-Path $env:USERPROFILE ".supabase\access-token"
  if (Test-Path $cliTokenPath) { return (Get-Content $cliTokenPath -Raw).Trim() }
  return $null
}

function Invoke-SupabaseApi {
  param([string]$Method, [string]$Uri, [object]$Body)
  $headers = @{
    Authorization = "Bearer $script:Token"
    "Content-Type"  = "application/json"
  }
  if ($Body) {
    return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 6)
  }
  return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers
}

function Wait-ProjectHealthy {
  param([string]$Ref)
  Write-Host "Aguardando projeto ficar ativo..." -ForegroundColor Yellow
  for ($i = 1; $i -le 60; $i++) {
    try {
      $health = Invoke-SupabaseApi -Method GET -Uri "https://api.supabase.com/v1/projects/$Ref/health"
      $db = $health | Where-Object { $_.name -eq "db" } | Select-Object -First 1
      if ($db.status -eq "ACTIVE_HEALTHY") {
        Write-Host "  Projeto saudavel." -ForegroundColor Green
        return
      }
    } catch { }
    Start-Sleep -Seconds 10
    Write-Host "  ... $i/60" -ForegroundColor DarkGray
  }
  throw "Timeout aguardando projeto Supabase."
}

function Set-EnvFile {
  param([string]$Url, [string]$AnonKey, [string]$ServiceKey, [string]$AppUrlVal)
  $lines = @()
  if (Test-Path .env.local) { $lines = Get-Content .env.local }
  elseif (Test-Path .env.example) { $lines = Get-Content .env.example }
  $map = @{
    NEXT_PUBLIC_SUPABASE_URL      = $Url
    NEXT_PUBLIC_SUPABASE_ANON_KEY  = $AnonKey
    SUPABASE_SERVICE_ROLE_KEY     = $ServiceKey
    NEXT_PUBLIC_APP_URL           = $AppUrlVal
  }
  $seen = @{}
  $out = foreach ($line in $lines) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $key = $matches[1]
      if ($map.ContainsKey($key)) { $seen[$key] = $true; "$key=$($map[$key])" } else { $line }
    } else { $line }
  }
  foreach ($key in $map.Keys) {
    if (-not $seen[$key]) { $out += "$key=$($map[$key])" }
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText((Join-Path $PWD ".env.local"), (($out -join "`n") + "`n"), $utf8)
  Write-Host "Atualizado .env.local" -ForegroundColor Green
}

Write-Host "=== InvestIA - Novo projeto Supabase ===" -ForegroundColor Cyan
$script:Token = Get-SupabaseToken
if (-not $script:Token) {
  Write-Host "Defina SUPABASE_ACCESS_TOKEN ou -AccessToken" -ForegroundColor Yellow
  exit 1
}

Write-Host "[1/7] Organizacoes..." -ForegroundColor Yellow
$orgs = Invoke-SupabaseApi -Method GET -Uri "https://api.supabase.com/v1/organizations"
if (-not $orgs -or $orgs.Count -eq 0) { throw "Nenhuma organizacao encontrada." }
$orgId = $orgs[0].id
Write-Host "  Org: $($orgs[0].name)" -ForegroundColor DarkGray

Write-Host "[2/7] Criando projeto $ProjectName ($Region)..." -ForegroundColor Yellow
$dbPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$createBody = @{
  organization_id = $orgId
  name            = $ProjectName
  region          = $Region
  db_pass         = $dbPass
}
try {
  $project = Invoke-SupabaseApi -Method POST -Uri "https://api.supabase.com/v1/projects" -Body $createBody
  $ref = $project.id
  if (-not $ref) { $ref = $project.ref }
} catch {
  $existing = Invoke-SupabaseApi -Method GET -Uri "https://api.supabase.com/v1/projects"
  $match = $existing | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1
  if (-not $match) { throw }
  $ref = $match.id
  if ($match.status -eq "INACTIVE") {
    Write-Host "  Restaurando projeto inativo..." -ForegroundColor Yellow
    Invoke-SupabaseApi -Method POST -Uri "https://api.supabase.com/v1/projects/$ref/restore" | Out-Null
    Wait-ProjectHealthy -Ref $ref
  }
}
if (-not $ref) { throw "API sem project ref." }

$url = "https://$ref.supabase.co"
Write-Host "  Ref: $ref" -ForegroundColor Green
Write-Host "  URL: $url" -ForegroundColor Green

$dbPassFile = "supabase\.temp\db-password.txt"
New-Item -ItemType Directory -Force -Path "supabase\.temp" | Out-Null
Set-Content -Path $dbPassFile -Value $dbPass -Encoding utf8
Set-Content -Path "supabase\.temp\project-ref" -Value $ref -Encoding utf8 -NoNewline

Wait-ProjectHealthy -Ref $ref

Write-Host "[3/7] API keys..." -ForegroundColor Yellow
$anonKey = $null
$serviceKey = $null
$keys = Invoke-SupabaseApi -Method GET -Uri "https://api.supabase.com/v1/projects/$ref/api-keys?reveal=true"
$anonKey = ($keys | Where-Object { $_.name -eq "anon" } | Select-Object -First 1).api_key
$serviceKey = ($keys | Where-Object { $_.name -eq "service_role" } | Select-Object -First 1).api_key
if (-not $anonKey -or -not $serviceKey) {
  $anonKey = ($keys | Where-Object { $_.type -eq "publishable" } | Select-Object -First 1).api_key
  $serviceKey = ($keys | Where-Object { $_.type -eq "secret" } | Select-Object -First 1).api_key
}
if (-not $anonKey -or -not $serviceKey) {
  throw "Nao foi possivel obter API keys em $url"
}

Write-Host "[4/7] .env.local..." -ForegroundColor Yellow
Set-EnvFile -Url $url -AnonKey $anonKey -ServiceKey $serviceKey -AppUrlVal $AppUrl

Write-Host "[5/7] DB password + link + migrations..." -ForegroundColor Yellow
try {
  Invoke-SupabaseApi -Method PATCH -Uri "https://api.supabase.com/v1/projects/$ref/database/password" -Body @{ password = $dbPass }
} catch {
  Write-Host "  usando senha existente (reset opcional no dashboard)" -ForegroundColor DarkGray
  if (Test-Path $dbPassFile) { $dbPass = (Get-Content $dbPassFile -Raw).Trim() }
}
npx supabase link --project-ref $ref -p $dbPass
if ($LASTEXITCODE -ne 0) { Write-Host "  link falhou" -ForegroundColor Yellow }
"y" | npx supabase db push
if ($LASTEXITCODE -ne 0) { Write-Host "  db push falhou" -ForegroundColor Yellow }

Write-Host "[6/7] config push..." -ForegroundColor Yellow
$configPath = "supabase\config.toml"
if (Test-Path $configPath) {
  $raw = Get-Content $configPath -Raw
  $raw = $raw -replace 'site_url = ".*?"', ('site_url = "' + $AppUrl + '"')
  Set-Content $configPath $raw -Encoding utf8
}
"y" | npx supabase config push 2>$null

Write-Host "[7/7] Vercel..." -ForegroundColor Yellow
npx vercel link --yes 2>$null
$envPairs = @(
  @("NEXT_PUBLIC_SUPABASE_URL", $url),
  @("NEXT_PUBLIC_SUPABASE_ANON_KEY", $anonKey),
  @("SUPABASE_SERVICE_ROLE_KEY", $serviceKey),
  @("NEXT_PUBLIC_APP_URL", $AppUrl)
)
foreach ($p in $envPairs) {
  Write-Host "  -> $($p[0])" -ForegroundColor DarkGray
  if ($p[0] -eq "SUPABASE_SERVICE_ROLE_KEY") {
    Set-Content -Path ".vercel-env-tmp" -Value $p[1] -NoNewline -Encoding ascii
    Get-Content ".vercel-env-tmp" -Raw | npx vercel env add $p[0] production --force --yes 2>$null
    Remove-Item ".vercel-env-tmp" -Force -ErrorAction SilentlyContinue
  } else {
    npx vercel env add $p[0] production --value $p[1] --force --yes 2>$null
  }
}

Write-Host "Deploy producao..." -ForegroundColor Yellow
npx vercel deploy --prod --yes

Write-Host "=== Concluido ===" -ForegroundColor Green
Write-Host "Dashboard: https://supabase.com/dashboard/project/$ref"
Write-Host "API: $url"
Write-Host "App: $AppUrl/login"
Write-Host "Senha DB: $dbPassFile"
