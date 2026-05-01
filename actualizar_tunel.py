"""
VÓRTICE — Iniciar backend + túnel Cloudflare + auto-deploy a Vercel

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia un túnel Cloudflare que expone localhost:8000
  3. Captura la URL dinámica del túnel
  4. Actualiza VITE_API_URL en Vercel via API (sin git push)
  5. Triggerea redeploy en Vercel automáticamente
  6. Mantiene backend + túnel vivos hasta Ctrl+C
"""

import subprocess
import re
import json
import time
import os
import sys
import signal
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

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
    time.sleep(3)
    if proc.poll() is not None:
        out = proc.stdout.read()
        print(f"[VORTICE] ERROR: Backend no arrancó:\n{out}")
        return None
    print("[VORTICE] Backend corriendo en http://localhost:8000")
    return proc


def iniciar_tunel():
    print("[VORTICE] Iniciando túnel de Cloudflare...")
    proc = subprocess.Popen(
        ["npx", "cloudflared", "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True,
    )
    url = None
    start_time = time.time()
    while time.time() - start_time < 30:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if line:
            print(f"  {line}")
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            print(f"\n[VORTICE] Túnel activo: {url}")
            break
    return url, proc


VERCEL_JSON_PATH = os.path.join(ROOT_DIR, "frontend", "vercel.json")


def actualizar_vercel_json(nueva_url):
    """Actualiza vercel.json con rewrites al tunnel."""
    print(f"[VORTICE] Actualizando vercel.json → {nueva_url}")
    data = {
        "routes": [
            {"src": "/api/(.*)", "dest": f"{nueva_url}/api/$1"},
            {"src": "/exercises/(.*)", "dest": f"{nueva_url}/exercises/$1"},
            {"src": "/gifs/(.*)", "dest": f"{nueva_url}/gifs/$1"},
            {"src": "/uploads/(.*)", "dest": f"{nueva_url}/uploads/$1"},
            {"handle": "filesystem"},
            {"src": "/(.*)", "dest": "/index.html"},
        ]
    }
    with open(VERCEL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"[VORTICE] vercel.json actualizado.")
    return True


def push_to_github():
    """Commit + push vercel.json → Vercel redeploya automáticamente."""
    print("[VORTICE] Pusheando a GitHub...")
    try:
        subprocess.run(["git", "add", VERCEL_JSON_PATH], cwd=ROOT_DIR, check=True)
        result = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT_DIR)
        if result.returncode == 0:
            print("[VORTICE] Sin cambios.")
            return
        subprocess.run(
            ["git", "commit", "-m", "tunnel: auto-update Cloudflare URL"],
            cwd=ROOT_DIR, check=True,
        )
        subprocess.run(["git", "push", "origin", "main"], cwd=ROOT_DIR, check=True)
        print("[VORTICE] Push OK → Vercel desplegará en ~1 min.")
    except Exception as e:
        print(f"[VORTICE] Error push: {e}")


if __name__ == "__main__":
    print("=" * 55)
    print("  VÓRTICE — Backend + Tunnel + Auto-Deploy")
    print("=" * 55)

    # 1. Backend
    backend_proc = iniciar_backend()
    if not backend_proc:
        print("[VORTICE] Abortando: backend no arrancó.")
        sys.exit(1)

    # 2. Túnel
    url, tunnel_proc = iniciar_tunel()
    if not url:
        print("[VORTICE] No se pudo obtener URL del túnel.")
        cleanup()

    # 3. Actualizar vercel.json + push
    actualizar_vercel_json(url)
    push_to_github()

    # 4. Mantener vivo
    print("\n" + "=" * 55)
    print(f"  Backend:  http://localhost:8000")
    print(f"  Túnel:    {url}")
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
                print("[VORTICE] Túnel se cayó. Reiniciando...")
                url, tunnel_proc = iniciar_tunel()
                if url:
                    actualizar_vercel_json(url)
                    push_to_github()
                else:
                    print("[VORTICE] No se pudo reconectar.")
                    cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()
