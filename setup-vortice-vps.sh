#!/bin/bash
# Setup automático de Vórtice en VPS DonWeb/Contabo/etc
# Ejecutar: chmod +x setup-vortice-vps.sh && ./setup-vortice-vps.sh

set -e

echo "=========================================="
echo "  VÓRTICE - Setup Automático en VPS"
echo "=========================================="

# 1. Actualizar sistema
echo "[1/8] Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias
echo "[2/8] Instalando Python y dependencias..."
sudo apt install -y python3.11 python3.11-venv python3-pip git curl wget

# 3. Crear directorio de la app
echo "[3/8] Creando directorio de la aplicación..."
mkdir -p ~/vortice

# 4. Clonar el repositorio
echo "[4/8] Clonando repositorio..."
cd ~/vortice
if [ -d "backend" ]; then
    echo "Repositorio ya existe, actualizando..."
    git pull origin main
else
    git clone https://github.com/vernaboutiqueshop-ui/Vorticex.git .
fi

# 5. Crear entorno virtual e instalar dependencias
echo "[5/8] Instalando dependencias Python..."
cd ~/vortice/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 6. Crear directorio para la base de datos
echo "[6/8] Configurando base de datos..."
mkdir -p ~/vortice/backend/data

# 7. Crear servicio systemd
echo "[7/8] Creando servicio systemd..."
sudo tee /etc/systemd/system/vortice.service > /dev/null <<EOF
[Unit]
Description=Vortice Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/vortice/backend
Environment="PATH=/home/$USER/vortice/backend/venv/bin"
Environment="PYTHONPATH=/home/$USER/vortice/backend"
ExecStart=/home/$USER/vortice/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 8. Iniciar servicio
echo "[8/8] Iniciando servicio..."
sudo systemctl daemon-reload
sudo systemctl enable vortice
sudo systemctl start vortice

echo ""
echo "=========================================="
echo "  ¡VÓRTICE INSTALADO!"
echo "=========================================="
echo ""
echo "Estado del servicio:"
sudo systemctl status vortice --no-pager -l

echo ""
echo "Para ver logs en tiempo real:"
echo "  sudo journalctl -u vortice -f"
echo ""
echo "Para reiniciar:"
echo "  sudo systemctl restart vortice"
echo ""
echo "La API está corriendo en: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
