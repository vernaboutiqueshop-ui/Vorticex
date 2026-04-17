@echo off
echo [VORTICE] Iniciando Entorno Local-First...

:: Iniciar Túnel Cloudflare (Auto-Discovery)
start cmd /k "cd backend && python vortice_discovery.py"

:: Iniciar Backend
start cmd /k "cd backend && python main.py"

:: Iniciar Frontend (Local)
start cmd /k "cd frontend && npm run dev"

echo [OK] Backend y Frontend lanzados. 
echo Revisa las ventanas de comandos para ver el estado.
pause
