#!/usr/bin/env pwsh
# ============================================
# Script de desplegament a GitHub
# ============================================
# 
# Ús: .\setup-github.ps1 -Username "el_teu_usuari" -RepoName "estacions-meteo-escoles"
#

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "estacions-meteo-escoles"
)

Write-Host "`n🌤️  Setup GitHub per Estacions Meteorològiques Escolars" -ForegroundColor Cyan
Write-Host "=" * 55 -ForegroundColor Cyan

# Verificar que estem al directori correcte
if (!(Test-Path "index.html") -or !(Test-Path "js/config.js")) {
    Write-Host "❌ Error: Executa aquest script des del directori weather-station-dashboard" -ForegroundColor Red
    exit 1
}

# Actualitzar config.js amb l'usuari de GitHub
Write-Host "`n📝 Actualitzant configuració..." -ForegroundColor Yellow

$configPath = "js/config.js"
$configContent = Get-Content $configPath -Raw
$configContent = $configContent -replace "username: 'EL_TEU_USUARI'", "username: '$Username'"
$configContent = $configContent -replace "repository: 'estacions-meteo-escoles'", "repository: '$RepoName'"
Set-Content $configPath $configContent

Write-Host "✅ Configuració actualitzada amb usuari: $Username" -ForegroundColor Green

# Inicialitzar Git si no existeix
if (!(Test-Path ".git")) {
    Write-Host "`n📦 Inicialitzant repositori Git..." -ForegroundColor Yellow
    git init
}

# Afegir tots els arxius
Write-Host "`n📁 Afegint arxius..." -ForegroundColor Yellow
git add .

# Fer commit
Write-Host "`n💾 Creant commit inicial..." -ForegroundColor Yellow
git commit -m "🚀 Primera versió del dashboard meteorològic"

# Configurar el remot
$remoteUrl = "https://github.com/$Username/$RepoName.git"
Write-Host "`n🔗 Configurant repositori remot: $remoteUrl" -ForegroundColor Yellow

# Verificar si ja existeix un remot
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

Write-Host "`n" + "=" * 55 -ForegroundColor Cyan
Write-Host "✅ Preparació completada!" -ForegroundColor Green
Write-Host "`n📋 Següents passos:`n" -ForegroundColor Yellow

Write-Host "1. Crea el repositori a GitHub:" -ForegroundColor White
Write-Host "   👉 https://github.com/new" -ForegroundColor Blue
Write-Host "   Nom: $RepoName" -ForegroundColor Gray
Write-Host "   Visibilitat: Public" -ForegroundColor Gray
Write-Host "   NO marquis 'Add a README file'`n" -ForegroundColor Gray

Write-Host "2. Un cop creat, puja els arxius:" -ForegroundColor White
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git push -u origin main`n" -ForegroundColor Cyan

Write-Host "3. Activa GitHub Pages:" -ForegroundColor White
Write-Host "   Settings > Pages > Source: main branch`n" -ForegroundColor Gray

Write-Host "4. La teva pàgina estarà a:" -ForegroundColor White
Write-Host "   https://$Username.github.io/$RepoName/`n" -ForegroundColor Green

Write-Host "=" * 55 -ForegroundColor Cyan
