# Deploy TaskFlow Dashboard to GitHub + Fly.io
# Run with:  powershell -ExecutionPolicy Bypass -File .\deploy-to-github-and-fly.ps1
param(
  [string]$GitHubUsername,
  [string]$RepoName = "taskflow-dashboard"
)

$ErrorActionPreference = "Stop"

function Test-Command($cmd) {
  return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# ---------------------------------------------------------------------------
# 1. GitHub repository
# ---------------------------------------------------------------------------

if (Test-Command gh) {
  Write-Host "GitHub CLI gefunden. Erstelle/Pushe Repository '$RepoName'..." -ForegroundColor Cyan
  gh repo create $RepoName --public --source=. --remote=origin --push
} else {
  if (-not $GitHubUsername) {
    $GitHubUsername = Read-Host "Dein GitHub Username (da gh CLI nicht installiert ist)"
  }

  Write-Host "GitHub CLI nicht gefunden." -ForegroundColor Yellow
  Write-Host "Bitte erstelle manuell ein Repository unter: https://github.com/new" -ForegroundColor Yellow
  Write-Host "Name: $RepoName, dann druecke hier Enter." -ForegroundColor Yellow
  Read-Host

  git remote remove origin 2>$null
  git remote add origin "https://github.com/$GitHubUsername/$RepoName.git"
  git branch -M main
  git push -u origin main
}

# ---------------------------------------------------------------------------
# 2. Fly.io deploy
# ---------------------------------------------------------------------------

if (-not (Test-Command flyctl)) {
  Write-Host "flyctl nicht gefunden. Bitte installiere es zuerst: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Red
  exit 1
}

Write-Host "Melde dich bei Fly.io an (oeffnet ggf. den Browser)..." -ForegroundColor Cyan
flyctl auth login

Write-Host "Starte Fly.io Launch (erkennt fly.toml + Dockerfile)..." -ForegroundColor Cyan
flyctl launch --no-deploy --name $RepoName --region fra

Write-Host "Setze Secrets..." -ForegroundColor Cyan
$jwt = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
flyctl secrets set JWT_SECRET="$jwt"
flyctl secrets set ADMIN_EMAIL="admin@taskflow.local"
$adminPassword = Read-Host "Admin-Passwort fuer die Produktion (oder Enter fuer 'admin123')" -AsSecureString
$adminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))
if (-not $adminPasswordPlain) { $adminPasswordPlain = "admin123" }
flyctl secrets set ADMIN_PASSWORD="$adminPasswordPlain"

Write-Host "Deploye..." -ForegroundColor Cyan
# --ha=false is required because a single Fly Volume can only attach to one machine.
flyctl deploy --remote-only --ha=false

Write-Host "`nFertig! Deine App sollte bald unter https://$RepoName.fly.dev erreichbar sein." -ForegroundColor Green
