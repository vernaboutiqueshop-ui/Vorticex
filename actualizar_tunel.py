"""
VÓRTICE — Iniciar backend + túnel Cloudflare + auto-push a Vercel

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia un túnel Cloudflare que expone localhost:8000
  3. Captura la URL dinámica del túnel
  4. Actualiza frontend/vercel.json con la nueva URL
  5. Hace git add + commit + push → Vercel se re-deploya automáticamente
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
VERCEL_JSON_PATH = os.path.join(ROOT_DIR, "frontend", "vercel.json")
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
    # Esperar a que arranque
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
        ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
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


def actualizar_vercel_json(nueva_url):
    print(f"[VORTICE] Actualizando vercel.json → {nueva_url}")
    with open(VERCEL_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    cambios = 0
    for route in data.get("routes", []):
        if "dest" in route and "trycloudflare.com" in route["dest"]:
            old = route["dest"]
            route["dest"] = re.sub(
                r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", nueva_url, route["dest"]
            )
            if old != route["dest"]:
                cambios += 1

    if cambios == 0:
        print("[VORTICE] vercel.json ya tenía la URL correcta. Sin cambios.")
        return False

    with open(VERCEL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"[VORTICE] vercel.json actualizado ({cambios} rutas).")
    return True


def push_to_github():
    print("[VORTICE] Subiendo a GitHub...")
    try:
        subprocess.run(["git", "add", VERCEL_JSON_PATH], cwd=ROOT_DIR, check=True)
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=ROOT_DIR,
        )
        if result.returncode == 0:
            print("[VORTICE] Sin cambios para commitear.")
            return
        subprocess.run(
            ["git", "commit", "-m", "tunnel: auto-update Cloudflare URL"],
            cwd=ROOT_DIR,
            check=True,
        )
        subprocess.run(["git", "push"], cwd=ROOT_DIR, check=True)
        print("[VORTICE] Push completado. Vercel desplegará en ~1 min.")
    except Exception as e:
        print(f"[VORTICE] Error en push: {e}")


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

    # 3. Actualizar vercel.json
    changed = actualizar_vercel_json(url)

    # 4. Push si hubo cambios
    if changed:
        push_to_github()

    # 5. Mantener vivo
    print("\n" + "=" * 55)
    print(f"  Backend:  http://localhost:8000")
    print(f"  Túnel:    {url}")
    print(f"  Vercel:   https://vorticex.vercel.app")
    print(f"  Ctrl+C para detener todo")
    print("=" * 55 + "\n")

    try:
        while True:
            # Verificar que ambos procesos sigan vivos
            if backend_proc.poll() is not None:
                print("[VORTICE] Backend se detuvo. Reiniciando...")
                backend_proc = iniciar_backend()
                if not backend_proc:
                    cleanup()
            if tunnel_proc.poll() is not None:
                print("[VORTICE] Túnel se detuvo. Reiniciando...")
                url, tunnel_proc = iniciar_tunel()
                if url:
                    if actualizar_vercel_json(url):
                        push_to_github()
                else:
                    print("[VORTICE] No se pudo reconectar el túnel.")
                    cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()
