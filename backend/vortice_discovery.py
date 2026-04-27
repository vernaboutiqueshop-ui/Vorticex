import subprocess
import re
import sys
import os
import time
import threading

# Añadir el directorio actual al path para importar core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from core.database_firebase import db, firestore
    print("[DISCOVERY] Firebase conectado correctamente.")
except Exception as e:
    print(f"[DISCOVERY ERROR] No se pudo conectar a Firebase: {e}")
    sys.exit(1)

def update_cloud_url(url):
    """Actualiza la URL en Firestore para que el frontend la descubra."""
    try:
        doc_ref = db.collection("config").document("server")
        doc_ref.set({
            "url": url,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "status": "online"
        }, merge=True)
        print(f"[DISCOVERY] URL publicada en Firebase: {url}")
    except Exception as e:
        print(f"[DISCOVERY ERROR] Fallo al actualizar Firestore: {e}")

def find_cloudflared():
    """Busca el ejecutable de cloudflared en rutas comunes si no está en el PATH."""
    # 1. Intentar comando directo
    try:
        subprocess.run(["cloudflared", "--version"], capture_output=True, check=True)
        return "cloudflared"
    except:
        pass
    
    # 2. Rutas conocidas (npm cache/_npx)
    user_home = os.path.expanduser("~")
    npx_path = os.path.join(user_home, "AppData", "Local", "npm-cache", "_npx")
    if os.path.exists(npx_path):
        for root, dirs, files in os.walk(npx_path):
            if "cloudflared.exe" in files:
                return os.path.join(root, "cloudflared.exe")
    
    return None

def run_tunnel():
    """Inicia cloudflared y captura la URL generada."""
    path = find_cloudflared()
    if not path:
        print("[DISCOVERY ERROR] No se encontró 'cloudflared.exe'. Por favor, instálalo o asegúrate de que esté disponible.")
        return

    print(f"[DISCOVERY] Iniciando túnel usando: {path}")
    
    # Comando para el túnel gratuito
    cmd = [path, "tunnel", "--url", "http://localhost:8000"]
    
    # Iniciamos el proceso capturando stderr (donde cloudflared tira los logs)
    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)

    url_found = False
    
    # Leemos la salida línea por línea
    for line in iter(process.stderr.readline, ''):
        print(f"[CLOUDFLARED] {line.strip()}")
        
        # Buscamos la URL con regex
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match and not url_found:
            url = match.group(0)
            print(f"\n[DISCOVERY] ¡URL DETECTADA!: {url}")
            update_cloud_url(url)
            url_found = True
            print("[DISCOVERY] Manteniendo túnel activo... (No cierres esta ventana)\n")
    
    process.wait()

if __name__ == "__main__":
    try:
        run_tunnel()
    except KeyboardInterrupt:
        print("\n[DISCOVERY] Cerrando túnel...")
        # Opcional: Marcar como offline en Firebase
        try:
            db.collection("config").document("server").update({"status": "offline"})
        except: pass
        sys.exit(0)
