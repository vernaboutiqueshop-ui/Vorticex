$password = "Sanluis673!pregunta20"
$commands = @"
systemctl status vortice --no-pager
echo "---LOGS---"
journalctl -u vortice -n 20 --no-pager
echo "---PROCESOS---"
ps aux | grep -E "python|cloudflared" | grep -v grep
"@

# Usar plink si existe, si no instrucciones
Write-Host "Verificando conexion al VPS..."
$env:SSHPASS = $password
