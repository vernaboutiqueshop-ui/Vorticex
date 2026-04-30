import subprocess
import re
import json
import time
import os

# Configuración
VERCEL_JSON_PATH = os.path.abspath("frontend/vercel.json")

def obtener_url_tunel():
    print("[VORTICE] Iniciando túnel de Cloudflare...")
    # Ejecutamos cloudflared y capturamos la salida
    process = subprocess.Popen(
        ["npx", "cloudflared", "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    url = None
    # Buscamos la URL en los logs (tarda unos segundos en aparecer)
    start_time = time.time()
    while time.time() - start_time < 30: # 30 segundos de timeout
        line = process.stdout.readline()
        if not line:
            break
        print(line.strip())
        
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            print(f"\n[VORTICE] ¡Túnel detectado!: {url}")
            break
    
    return url, process

def actualizar_vercel_json(nueva_url):
    print(f"[VORTICE] Actualizando {VERCEL_JSON_PATH}...")
    with open(VERCEL_JSON_PATH, "r") as f:
        data = json.load(f)

    # Actualizar todas las rutas que apuntan al túnel
    for route in data.get("routes", []):
        if "dest" in route and "trycloudflare.com" in route["dest"]:
            # Reemplazar la parte del dominio preservando el resto de la ruta
            route["dest"] = re.sub(r"https://.*?\.trycloudflare\.com", nueva_url, route["dest"])

    with open(VERCEL_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print("[VORTICE] vercel.json actualizado con éxito.")

def push_to_github():
    print("[VORTICE] Subiendo cambios a GitHub...")
    try:
        subprocess.run(["git", "add", VERCEL_JSON_PATH], check=True)
        subprocess.run(["git", "commit", "-m", "⚡ Auto-update Cloudflare Tunnel URL"], check=True)
        subprocess.run(["git", "push"], check=True)
        print("[VORTICE] ¡Push completado! Vercel se está desplegando.")
    except Exception as e:
        print(f"[VORTICE] Error al subir a GitHub: {e}")

if __name__ == "__main__":
    url, process = obtener_url_tunel()
    if url:
        actualizar_vercel_json(url)
        push_to_github()
        print("\n[VORTICE] Todo listo. Mantén esta ventana abierta para que el túnel siga activo.")
        try:
            # Mantener el proceso del túnel vivo
            while True:
                line = process.stdout.readline()
                if not line: break
                # print(line.strip()) # Opcional: ver logs del túnel
        except KeyboardInterrupt:
            print("\n[VORTICE] Cerrando túnel...")
            process.terminate()
    else:
        print("[VORTICE] No se pudo obtener la URL del túnel. Revisa tu conexión.")
        process.terminate()
