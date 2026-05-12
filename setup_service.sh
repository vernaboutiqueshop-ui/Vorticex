#!/bin/bash
# Script para instalar el servicio systemd de Vórtice en el VPS

echo "=== Instalando servicio Vórtice ==="

# Matar procesos anteriores
pkill -f "actualizar_tunel.py" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

# Crear el archivo de servicio systemd
cat > /etc/systemd/system/vortice.service << 'EOF'
[Unit]
Description=Vortice Health Backend + Cloudflare Tunnel
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/vortice
ExecStart=/usr/bin/python3 /root/vortice/actualizar_tunel.py
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
Environment=HOME=/root

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd y habilitar el servicio
systemctl daemon-reload
systemctl enable vortice
systemctl start vortice

# Esperar y mostrar status
sleep 5
systemctl status vortice --no-pager

echo ""
echo "=== HECHO. El servicio arranca solo al reiniciar el VPS ==="
echo "Comandos utiles:"
echo "  journalctl -u vortice -f     # Ver logs en tiempo real"
echo "  systemctl restart vortice    # Reiniciar"
echo "  systemctl stop vortice       # Parar"
