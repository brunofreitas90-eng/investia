# Vincula projeto Supabase existente (criado em https://database.new)
# Uso:
#   .\scripts\link-supabase-manual.ps1 -ProjectRef "xxx" -AnonKey "eyJ..." -ServiceRoleKey "eyJ..." -DbPassword "senha"

param(
  [Parameter(Mandatory)][string]$ProjectRef,
  [Parameter(Mandatory)][string]$AnonKey,
  [Parameter(Mandatory)][string]$ServiceRoleKey,
  [Parameter(Mandatory)][string]$DbPassword,
  [string]$AppUrl = "https://investia-nu.vercel.app"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$url = "https://$ProjectRef.supabase.co"

New-Item -ItemType Directory -Force -Path "supabase\.temp" | Out-Null
Set-Content -Path "supabase\.temp\project-ref" -Value $ProjectRef -Encoding utf8 -NoNewline
Set-Content -Path "supabase\.temp\db-password.txt" -Value $DbPassword -Encoding utf8

$updates = @{
  NEXT_PUBLIC_SUPABASE_URL      = $url
  NEXT_PUBLIC_SUPABASE_ANON_KEY = $AnonKey
  SUPABASE_SERVICE_ROLE_KEY    = $ServiceRoleKey
  NEXT_PUBLIC_APP_URL          = $AppUrl
}

$lines = if (Test-Path .env.local) { Get-Content .env.local } else { Get-Content .env.example }
$seen = @{}
$out = foreach ($line in $lines) {
  if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
    $key = $matches[1]
    if ($updates.ContainsKey($key)) {
      $seen[$key] = $true
      "$key=$($updates[$key])"
    } else { $line }
  } else { $line }
}
foreach ($key in $updates.Keys) {
  if (-not $seen[$key]) { $out += "$key=$($updates[$key])" }
}
Set-Content .env.local ($out -join "`n") -Encoding utf8

Write-Host "Linkando $ProjectRef..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef -p $DbPassword
echo y | npx supabase db push
echo y | npx supabase config push 2>$null

npx vercel link --yes 2>$null
foreach ($pair in @(
  @{ n = "NEXT_PUBLIC_SUPABASE_URL"; v = $url },
  @{ n = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; v = $AnonKey },
  @{ n = "SUPABASE_SERVICE_ROLE_KEY"; v = $ServiceRoleKey },
  @{ n = "NEXT_PUBLIC_APP_URL"; v = $AppUrl }
)) {
  $pair.v | npx vercel env add $pair.n production --force --yes 2>$null
}

npx vercel deploy --prod --yes
Write-Host "Pronto: $AppUrl/login" -ForegroundColor Green
