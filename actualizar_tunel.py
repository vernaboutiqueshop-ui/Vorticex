"""
VÓRTICE — Iniciar backend + túnel Cloudflare (Auto-Update Vercel)

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia cloudflared tunnel (trycloudflare.com)
  3. Captura la URL y actualiza vercel.json automáticamente
  4. Hace git push para que Vercel se actualice solo
"""

import subprocess
import threading
import time
import os
import sys
import signal
import re
import json

IS_WINDOWS = sys.platform == "win32"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

def find_cloudflared():
    if IS_WINDOWS:
        return "cloudflared.exe"
    return "cloudflared"

CLOUDFLARED_PATH = find_cloudflared()
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
    try:
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                print(f"  [{prefix}] {line}")
    except:
        pass


def iniciar_backend():
    print("[VORTICE] Iniciando backend FastAPI en :8000...")
    # Usar el ejecutable de python del venv si existe
    python_exe = sys.executable
    if not IS_WINDOWS:
        venv_python = os.path.join(BACKEND_DIR, "venv", "bin", "python")
        if os.path.exists(venv_python):
            python_exe = venv_python

    proc = subprocess.Popen(
        [python_exe, "main.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    t = threading.Thread(target=_stream_output, args=(proc, "BACKEND"), daemon=True)
    t.start()
    time.sleep(3)
    if proc.poll() is not None:
        return None
    print("[VORTICE] Backend corriendo en http://localhost:8000")
    return proc


def actualizar_vercel_y_push(url):
    try:
        # Buscar todos los vercel.json en el proyecto
        vercel_files = [os.path.join(ROOT_DIR, "vercel.json")]
        frontend_vercel = os.path.join(ROOT_DIR, "frontend", "vercel.json")
        if os.path.exists(frontend_vercel):
            vercel_files.append(frontend_vercel)
        
        any_modified = False
        for vercel_path in vercel_files:
            if not os.path.exists(vercel_path):
                continue
                
            print(f"[VORTICE] Verificando {vercel_path}...")
            with open(vercel_path, 'r') as f:
                data = json.load(f)
            
            # Actualizar destinos en redirects o rewrites
            modified = False
            for key in ['redirects', 'rewrites']:
                for entry in data.get(key, []):
                    if 'destination' in entry:
                        # Verificar si es una URL de túnel o ngrok vieja
                        dest = entry['destination']
                        if 'trycloudflare.com' in dest or 'ngrok' in dest or '179.43.120.62' in dest:
                            # Extraer el path original (/api/, /exercises/, etc)
                            path_match = re.search(r'(/api/|/exercises/|/gifs/|/uploads/)[^"]*', dest)
                            if path_match:
                                path = path_match.group(1)
                                new_dest = f"{url.rstrip('/')}{path}:path*"
                                if entry['destination'] != new_dest:
                                    entry['destination'] = new_dest
                                    modified = True
            
            if modified:
                with open(vercel_path, 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"[VORTICE] {os.path.basename(vercel_path)} actualizado.")
                any_modified = True
        
        if any_modified:
            # Auto-Push
            print("[VORTICE] Realizando Auto-Push a GitHub...")
            # Primero sincronizar con remoto (ignorar cambios locales en DB)
            subprocess.run(["git", "fetch", "origin", "main"], cwd=ROOT_DIR)
            subprocess.run(["git", "reset", "--soft", "origin/main"], cwd=ROOT_DIR)
            subprocess.run(["git", "add", "vercel.json"], cwd=ROOT_DIR)
            if os.path.exists(frontend_vercel):
                subprocess.run(["git", "add", "frontend/vercel.json"], cwd=ROOT_DIR)
            subprocess.run(["git", "commit", "-m", f"vps: update tunnel url to {url}"], cwd=ROOT_DIR)
            subprocess.run(["git", "push", "origin", "main"], cwd=ROOT_DIR)
            print("[VORTICE] GitHub actualizado. Vercel se está redeployeando.")
        else:
            print("[VORTICE] No se requiere actualización en ningún vercel.json.")
            
    except Exception as e:
        print(f"[VORTICE] Error en auto-update: {e}")


def iniciar_tunel():
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True)
    else:
        subprocess.run(["pkill", "-9", "cloudflared"], capture_output=True)
    
    print("[VORTICE] Iniciando Cloudflare Quick Tunnel...")
    proc = subprocess.Popen(
        [CLOUDFLARED_PATH, "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    
    url = None
    # Esperar y capturar la URL de los logs (aumentado a 50 líneas para mayor seguridad)
    for _ in range(50):
        line = proc.stdout.readline()
        if line:
            print(f"  [TUNNEL] {line.strip()}")
            match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
            if match:
                url = match.group(0)
                break
        time.sleep(0.5)
        
    if url:
        print(f"[VORTICE] ¡Túnel Listo! URL: {url}")
        actualizar_vercel_y_push(url)
        return proc, url
    
    return None, None


if __name__ == "__main__":
    print("=" * 55)
    print("  VÓRTICE CLOUD — Autogestión 24/7")
    print("=" * 55)

    backend_proc = iniciar_backend()
    if not backend_proc:
        print("[VORTICE] Error: Backend no arrancó.")
        sys.exit(1)

    tunnel_proc, tunnel_url = iniciar_tunel()
    if not tunnel_proc:
        print("[VORTICE] Error: Tunnel no arrancó.")
        cleanup()

    print("\n" + "=" * 55)
    print(f"  Túnel:    {tunnel_url}")
    print(f"  Vercel:   https://vorticex.vercel.app")
    print(f"  Estado:   Sincronizado con GitHub")
    print("=" * 55 + "\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                backend_proc = iniciar_backend()
            time.sleep(10)
    except KeyboardInterrupt:
        cleanup()
