@echo off
echo [VORTICE] Iniciando Entorno Local-First...

:: Iniciar Backend
start cmd /k "cd backend && python main.py"

:: Iniciar Frontend
start cmd /k "cd frontend && npm run dev"

echo [OK] Backend y Frontend lanzados. 
echo Revisa las ventanas de comandos para ver el estado.
pause
