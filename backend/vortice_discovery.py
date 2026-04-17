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

def run_tunnel():
    """Inicia cloudflared y captura la URL generada."""
    print("[DISCOVERY] Iniciando túnel de Cloudflare...")
    
    # Comando para el túnel gratuito
    cmd = ["cloudflared", "tunnel", "--url", "http://localhost:8000"]
    
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
