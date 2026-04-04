@echo off
echo ===========================================
echo       INICIANDO VORTICE HEALTH...
echo ===========================================

echo.
echo [1/2] Levantando el Cerebro (Backend - FastAPI)...
:: Abre una nueva terminal, entra a backend y corre python usando tu entorno virtual (.venv)
start "Backend Vortice" cmd /k "cd backend && ..\.venv\Scripts\python.exe main.py"

timeout /t 3 >nul

echo [2/2] Levantando la Fachada (Frontend - React)...
:: Abre una nueva terminal, entra a frontend y ejecuta el servidor de Vite
start "Frontend Vortice" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================================
echo ¡Todos los servidores estan en linea!
echo - FastAPI Backend escuchando en:  http://localhost:8000
echo - React Frontend corriendo en:    http://localhost:5173
echo =========================================================
echo.
echo Para ver la app, abre tu navegador y entra a http://localhost:5173
echo Puedes cerrar esta ventana, las otras dos mantendran los servidores vivos.
echo.
pause
