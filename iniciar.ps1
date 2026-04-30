# vortice_start.ps1
Write-Host "[VORTICE] Iniciando Entorno Unificado..." -ForegroundColor Cyan

# Verificar si node_modules existe en la raíz
if (-not (Test-Path "node_modules")) {
    Write-Host "[VORTICE] Instalando dependencias de orquestación..." -ForegroundColor Yellow
    npm install
}

# Lanzar todo con un solo comando
npm start
