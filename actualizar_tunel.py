"""
VÓRTICE — Iniciar backend + túnel Cloudflare (gratis, sin límite)

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia cloudflared tunnel (trycloudflare.com)
  3. Muestra la URL temporal y actualiza Vercel automáticamente
  
La URL cambia cada vez que iniciás (gratis). Para URL fija necesitás
configurar un tunnel permanente en Cloudflare con tu dominio.
"""

import subprocess
import threading
import time
import os
import sys
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
CLOUDFLARED_PATH = "cloudflared"  # Asume que está en PATH

backend_proc = None
tunnel_proc = None


def cleanup(sig=None, frame=None):
    print("\n[VORTICE] Cerrando todo...")
    if tunnel_proc:
        tunnel_proc.terminate()
    if backend_proc:
        backend_proc.terminate()
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def _stream_output(proc, prefix="BACKEND"):
    """Read lines from proc.stdout and print them."""
    try:
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                print(f"  [{prefix}] {line}")
    except:
        pass


def iniciar_backend():
    print("[VORTICE] Iniciando backend FastAPI en :8000...")
    proc = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    # Stream backend output in background thread
    t = threading.Thread(target=_stream_output, args=(proc, "BACKEND"), daemon=True)
    t.start()
    time.sleep(3)
    if proc.poll() is not None:
        print(f"[VORTICE] ERROR: Backend no arrancó (exit code {proc.returncode})")
        return None
    print("[VORTICE] Backend corriendo en http://localhost:8000")
    return proc


def iniciar_tunel():
    # Matar cloudflared previo si quedó colgado
    subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True)
    time.sleep(1)
    print("[VORTICE] Iniciando Cloudflare Tunnel (trycloudflare.com)...")
    print("[VORTICE] Esperando URL temporal (puede tardar 5-10 seg)...")
    
    proc = subprocess.Popen(
        [CLOUDFLARED_PATH, "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    
    # Leer output para capturar la URL
    url = None
    for _ in range(30):  # Esperar hasta 30 segundos
        line = proc.stdout.readline()
        if line:
            print(f"  [TUNNEL] {line.strip()}")
            # Buscar URL tipo https://xxxxx.trycloudflare.com
            import re
            match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
            if match:
                url = match.group(0)
                break
        time.sleep(0.5)
    
    if not url:
        print("[VORTICE] ERROR: No se pudo obtener la URL del tunnel")
        proc.terminate()
        return None, None
    
    print(f"[VORTICE] Túnel activo: {url}")
    return proc, url


def actualizar_vercel_json(url):
    """Actualiza el vercel.json con la nueva URL del tunnel."""
    vercel_json_path = os.path.join(ROOT_DIR, "vercel.json")
    try:
        import json
        with open(vercel_json_path, 'r') as f:
            config = json.load(f)
        
        # Actualizar todas las rutas que apuntan al tunnel
        for route in config.get('routes', []):
            if 'destination' in route:
                # Reemplazar cualquier URL de tunnel anterior
                old_dest = route['destination']
                if 'trycloudflare.com' in old_dest or 'ngrok-free.dev' in old_dest:
                    route['destination'] = old_dest.replace(
                        old_dest.split('/api/')[0].split('/exercises/')[0].split('/gifs/')[0].split('/uploads/')[0],
                        url.rstrip('/')
                    )
        
        with open(vercel_json_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"[VORTICE] vercel.json actualizado con: {url}")
        return True
    except Exception as e:
        print(f"[VORTICE] ERROR actualizando vercel.json: {e}")
        return False


if __name__ == "__main__":
    print("=" * 55)
    print("  VÓRTICE — Backend + Cloudflare Tunnel (sin límite)")
    print("=" * 55)

    # 1. Backend
    backend_proc = iniciar_backend()
    if not backend_proc:
        print("[VORTICE] Abortando: backend no arrancó.")
        sys.exit(1)

    # 2. Túnel Cloudflare
    tunnel_proc, tunnel_url = iniciar_tunel()
    if not tunnel_proc:
        print("[VORTICE] Abortando: tunnel no arrancó.")
        cleanup()

    # 3. Actualizar Vercel config
    actualizar_vercel_json(tunnel_url)
    print("\n[VORTICE] IMPORTANTE: La URL cambió. Hacé commit y push para actualizar Vercel:")
    print(f"  git add vercel.json && git commit -m 'tunnel: {tunnel_url}' && git push origin main")

    # 4. Listo
    print("\n" + "=" * 55)
    print(f"  Backend:  http://localhost:8000")
    print(f"  Túnel:    {tunnel_url}")
    print(f"  Vercel:   https://vorticex.vercel.app")
    print(f"  Ctrl+C para detener todo")
    print("=" * 55 + "\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("[VORTICE] Backend se detuvo. Reiniciando...")
                backend_proc = iniciar_backend()
                if not backend_proc:
                    cleanup()
            if tunnel_proc.poll() is not None:
                print("[VORTICE] Tunnel se cayó. Reiniciando...")
                tunnel_proc, tunnel_url = iniciar_tunel()
                if not tunnel_proc:
                    print("[VORTICE] No se pudo reconectar.")
                    cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()
