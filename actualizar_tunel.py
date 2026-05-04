"""
VÓRTICE — Iniciar backend + ngrok (URL fija permanente)

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia ngrok con URL fija: subsidy-gothic-take.ngrok-free.dev
  3. El túnel nunca cambia - no necesita actualizar Vercel
"""

import subprocess
import threading
import time
import os
import sys
import signal

IS_WINDOWS = sys.platform == "win32"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Ngrok configuración - URL fija permanente
NGROK_DOMAIN = "subsidy-gothic-take.ngrok-free.dev"
NGROK_URL = f"https://{NGROK_DOMAIN}"
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
    print("[VORTICE] Actualizando código desde GitHub...")
    try:
        subprocess.run(["git", "fetch", "origin", "main"], cwd=ROOT_DIR, capture_output=True)
        subprocess.run(["git", "reset", "--hard", "origin/main"], cwd=ROOT_DIR, capture_output=True)
        print("[VORTICE] Código actualizado.")
    except Exception as e:
        print(f"[VORTICE] Warning: No se pudo actualizar código: {e}")
    
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


def iniciar_tunel():
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/IM", "ngrok.exe"], capture_output=True)
    else:
        subprocess.run(["pkill", "-9", "ngrok"], capture_output=True)
    
    print(f"[VORTICE] Iniciando ngrok con dominio fijo: {NGROK_DOMAIN}")
    tunnel_cmd = ["ngrok", "http", f"--url={NGROK_DOMAIN}", "8000"]
    tunnel_proc = subprocess.Popen(
        tunnel_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Ngrok tarda ~5 segundos en iniciar
    print("[VORTICE] Esperando ngrok...")
    time.sleep(5)
    url = NGROK_URL
    print(f"[VORTICE] ¡Túnel Listo! URL permanente: {url}")
    return tunnel_proc, url


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
    print(f"  Backend:  http://localhost:8000")
    print(f"  Túnel:    {tunnel_url} (FIJO)")
    print(f"  Web:      https://vorticex.vercel.app")
    print(f"  Status:   Online 24/7 - Auto-restart activado")
    print("=" * 55 + "\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                backend_proc = iniciar_backend()
            time.sleep(10)
    except KeyboardInterrupt:
        cleanup()
