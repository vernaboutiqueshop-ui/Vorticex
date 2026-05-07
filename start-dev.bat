@echo off
echo ============================================
echo   VORTICE - Ambiente DEV Local
echo ============================================
echo.

echo [1/2] Iniciando Backend en puerto 8000...
start "Vortice Backend" cmd /k "cd /d c:\Users\Gonzalo\entrenador-ia\backend && python main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend en puerto 5173...
start "Vortice Frontend" cmd /k "cd /d c:\Users\Gonzalo\entrenador-ia\frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
start http://localhost:5173
