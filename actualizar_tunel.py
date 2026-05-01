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
import urllib.request
import urllib.error
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Cargar .env de la raíz del proyecto
load_dotenv(os.path.join(ROOT_DIR, ".env"))

# Vercel API (leer desde .env)
VERCEL_TOKEN = os.getenv("VERCEL_TOKEN", "")
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID", "")
VERCEL_TEAM_ID = os.getenv("VERCEL_TEAM_ID", "")

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


def vercel_api(method, path, body=None):
    sep = "&" if "?" in path else "?"
    url = f"https://api.vercel.com{path}{sep}teamId={VERCEL_TEAM_ID}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {VERCEL_TOKEN}")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  [VERCEL API] {method} {path} → {e.code}: {err[:200]}")
        return None


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


def actualizar_vercel_env(nueva_url):
    """Actualiza VITE_API_URL en Vercel via API y triggerea redeploy."""
    print(f"[VORTICE] Seteando VITE_API_URL = {nueva_url}")

    # 1. Leer env vars existentes
    envs = vercel_api("GET", f"/v9/projects/{VERCEL_PROJECT_ID}/env")
    if not envs:
        return False

    env_id = None
    current_value = None
    for env in envs.get("envs", []):
        if env.get("key") == "VITE_API_URL":
            env_id = env["id"]
            current_value = env.get("value", "")
            break

    if current_value == nueva_url:
        print("[VORTICE] Variable ya actualizada. Sin cambios.")
        return True

    # 2. Actualizar o crear
    if env_id:
        result = vercel_api("PATCH", f"/v9/projects/{VERCEL_PROJECT_ID}/env/{env_id}", {
            "value": nueva_url,
        })
    else:
        result = vercel_api("POST", f"/v10/projects/{VERCEL_PROJECT_ID}/env", {
            "key": "VITE_API_URL",
            "value": nueva_url,
            "type": "plain",
            "target": ["production", "preview", "development"],
        })

    if not result:
        return False

    print("[VORTICE] Variable actualizada en Vercel.")

    # 3. Triggerar redeploy
    print("[VORTICE] Triggerando redeploy...")
    deploy = vercel_api("POST", f"/v13/deployments", {
        "name": "vorticex",
        "project": VERCEL_PROJECT_ID,
        "target": "production",
        "gitSource": {
            "type": "github",
            "repo": "vernaboutiqueshop-ui/Vorticex",
            "ref": "main",
        },
    })

    if deploy and deploy.get("id"):
        print(f"[VORTICE] Redeploy OK → https://vorticex.vercel.app (~1 min)")
    else:
        print("[VORTICE] Env actualizada, pero redeploy falló. Hacelo manual.")
    return True


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

    # 3. Actualizar Vercel env + redeploy
    actualizar_vercel_env(url)

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
                    actualizar_vercel_env(url)
                else:
                    print("[VORTICE] No se pudo reconectar.")
                    cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()
