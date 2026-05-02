#!/bin/bash
# VPS Fix para Vórtice - Ubuntu 22.04
# Uso: chmod +x vps-setup-fix.sh && ./vps-setup-fix.sh

set -e

echo "=========================================="
echo "  VÓRTICE - VPS FIX & OPTIMIZE"
echo "=========================================="

# 1. Instalar dependencias faltantes
echo "[1/5] Instalando dependencias (docker-compose, net-tools)..."
sudo apt update
sudo apt install -y docker-compose net-tools psmisc

# 2. Instalar Cloudflared (Cloudflare Tunnels)
if ! command -v cloudflared &> /dev/null; then
    echo "[2/5] Instalando Cloudflared..."
    sudo mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflare-main.gpg $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-main.list
    sudo apt update && sudo apt install cloudflared
else
    echo "[2/5] Cloudflared ya está instalado."
fi

# 3. Configurar Backend como Servicio (Systemd)
echo "[3/5] Configurando systemd service (/etc/systemd/system/vortice.service)..."
# Detectar si estamos en /root o /home
VORTICE_PATH=$(pwd)
if [[ "$VORTICE_PATH" == *"/root/vortice"* ]]; then
    BASE_DIR="/root/vortice"
else
    BASE_DIR="$HOME/vortice"
fi

sudo tee /etc/systemd/system/vortice.service > /dev/null <<EOF
[Unit]
Description=Vortice Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$BASE_DIR/backend
Environment="PATH=$BASE_DIR/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$BASE_DIR/backend"
ExecStart=$BASE_DIR/backend/venv/bin/python main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vortice
sudo systemctl restart vortice

# 4. Configurar Nginx Reverse Proxy
echo "[4/5] Configurando Nginx como Proxy Inverso..."
sudo tee /etc/nginx/sites-available/vortice > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Para los GIFs
    location /gifs/ {
        alias $BASE_DIR/backend/data/exercises/gifs/;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/vortice /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 5. Listo
echo ""
echo "=========================================="
echo "  ¡VPS FIX COMPLETADO!"
echo "=========================================="
echo "Backend:  http://localhost:8000 (running via systemd)"
echo "Nginx:    http://$(hostname -I | awk '{print $1}') (proxying to :8000)"
echo ""
echo "PRÓXIMO PASO (Túnel Cloudflare):"
echo "1. Ejecuta: cloudflared tunnel login"
echo "2. Abre el link que aparecerá para autorizar."
echo "3. Crea el túnel: cloudflared tunnel create vortice-vps"
echo "4. Levanta el túnel: cloudflared tunnel run --url http://localhost:8000 vortice-vps"
echo "=========================================="
