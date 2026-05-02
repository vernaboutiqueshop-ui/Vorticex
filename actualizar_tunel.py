"""
VÓRTICE — Iniciar backend + túnel ngrok (URL fija)

Uso:
  python actualizar_tunel.py

Qué hace:
  1. Inicia el backend FastAPI en localhost:8000
  2. Inicia ngrok con dominio estático fijo
  3. Mantiene backend + túnel vivos hasta Ctrl+C
  (No necesita git push ni redeploy — la URL nunca cambia)
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

# Buscar ngrok automáticamente
def find_ngrok():
    if IS_WINDOWS:
        paths = [
            os.path.join(os.path.expanduser("~"), "ngrok", "ngrok.exe"),
            "ngrok.exe"
        ]
    else:
        paths = [
            os.path.join(os.path.expanduser("~"), "ngrok"),
            "/usr/local/bin/ngrok",
            "ngrok"
        ]
    
    for p in paths:
        if os.path.exists(p) or (not os.path.isabs(p) and subprocess.run(["which" if not IS_WINDOWS else "where", p], capture_output=True).returncode == 0):
            return p
    return "ngrok.exe" if IS_WINDOWS else "ngrok"

NGROK_PATH = find_ngrok()
NGROK_DOMAIN = "compare-obsessed-stoke.ngrok-free.dev"

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
    # Matar ngrok previo si quedó colgado
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/IM", "ngrok.exe"], capture_output=True)
    else:
        subprocess.run(["pkill", "-9", "ngrok"], capture_output=True)
    
    time.sleep(1)
    print(f"[VORTICE] Iniciando ngrok → {NGROK_DOMAIN}")
    proc = subprocess.Popen(
        [NGROK_PATH, "http", "--url", NGROK_DOMAIN,
         "--request-header-add", "ngrok-skip-browser-warning:true",
         "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    time.sleep(3)
    if proc.poll() is not None:
        out = proc.stdout.read()
        print(f"[VORTICE] ERROR: ngrok no arrancó:\n{out}")
        return None
    print(f"[VORTICE] Túnel activo: https://{NGROK_DOMAIN}")
    return proc


if __name__ == "__main__":
    print("=" * 55)
    print("  VÓRTICE — Backend + ngrok (URL fija)")
    print("=" * 55)

    # 1. Backend
    backend_proc = iniciar_backend()
    if not backend_proc:
        print("[VORTICE] Abortando: backend no arrancó.")
        sys.exit(1)

    # 2. Túnel ngrok
    tunnel_proc = iniciar_tunel()
    if not tunnel_proc:
        print("[VORTICE] Abortando: ngrok no arrancó.")
        cleanup()

    # 3. Listo
    print("\n" + "=" * 55)
    print(f"  Backend:  http://localhost:8000")
    print(f"  Túnel:    https://{NGROK_DOMAIN}")
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
                print("[VORTICE] ngrok se cayó. Reiniciando...")
                tunnel_proc = iniciar_tunel()
                if not tunnel_proc:
                    print("[VORTICE] No se pudo reconectar.")
                    cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()
