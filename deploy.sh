#!/bin/bash
# deploy.sh - Actualización rápida de Vórtice en el VPS
# Uso: ./deploy.sh

echo "[VORTICE] Actualizando desde GitHub..."
git pull origin main

echo "[VORTICE] Verificando dependencias..."
cd backend
source venv/bin/activate
pip install -r requirements.txt

echo "[VORTICE] Reiniciando servicio..."
sudo systemctl restart vortice

echo "[VORTICE] ¡Todo listo! Vórtice está al día."
sudo systemctl status vortice --no-pager -l
