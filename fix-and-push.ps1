# Fix package-lock.json and push all project changes to GitHub
# Run with:  powershell -ExecutionPolicy Bypass -File .\fix-and-push.ps1

$ErrorActionPreference = "Stop"

# Ensure we are in the project directory
$projectDir = "C:\Users\Admin\Downloads\funktionales-dashboard"
if ((Get-Location).Path -ne $projectDir) {
  Write-Host "Wechsle in das Projektverzeichnis..." -ForegroundColor Cyan
  Set-Location $projectDir
}

Write-Host "Schritt 1: package-lock.json neu generieren..." -ForegroundColor Cyan
npm install

Write-Host "Schritt 2: Alle Projekt-Aenderungen hinzufuegen..." -ForegroundColor Cyan
# .gitignore prevents unwanted files (node_modules, dist, env, db) from being added.
git add .

$hasChanges = git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "Keine Aenderungen zum Committen." -ForegroundColor Yellow
  exit 0
}

Write-Host "Schritt 3: Commit erstellen..." -ForegroundColor Cyan
git commit -m "fix: regenerate lock file and require Node 22"

Write-Host "Schritt 4: Zu GitHub pushen..." -ForegroundColor Cyan
git push origin main

Write-Host "`nFertig! GitHub Actions sollte jetzt laufen." -ForegroundColor Green
