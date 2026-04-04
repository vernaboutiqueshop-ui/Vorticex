"""
SCRIPT: Descargador de imágenes locales para el catálogo de ejercicios.
Descarga todas las imágenes/GIFs del dataset free-exercise-db a data/gifs/
y actualiza la DB con la ruta local.

Usar: python scripts/descargar_imagenes.py
"""
import os
import sys
import time
import sqlite3
import requests
import json

# Rutas
DATA_DIR   = "data"
GIF_DIR    = os.path.join(DATA_DIR, "gifs")
DB_FILE    = os.path.join(DATA_DIR, "entrenador.db")
BASE_URL   = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"

os.makedirs(GIF_DIR, exist_ok=True)

def descargar_imagenes():
    conn = sqlite3.connect(DB_FILE)
    cur  = conn.cursor()
    
    # Obtener todos los ejercicios sin imagen local
    cur.execute("SELECT id_ejercicio, nombre_en FROM catalogo_ejercicios")
    ejercicios = cur.fetchall()
    
    print(f"[DESCARGADOR] Iniciando descarga para {len(ejercicios)} ejercicios...")
    
    ok  = 0
    err = 0
    
    for ex_id, nombre_en in ejercicios:
        # Nombre limpio para la URL del repo
        filename = ex_id  # Ya tiene el formato correcto: "3_4_Sit-Up"
        local_dir = os.path.join(GIF_DIR, filename)
        os.makedirs(local_dir, exist_ok=True)
        
        local_path_0 = os.path.join(local_dir, "0.jpg")
        
        # Saltear si ya está descargado
        if os.path.exists(local_path_0):
            # Actualizar DB de todos modos
            rel_path = local_path_0.replace("\\", "/")
            cur.execute("UPDATE catalogo_ejercicios SET gif_local = ? WHERE id_ejercicio = ?", (rel_path, ex_id))
            ok += 1
            continue
        
        # Descargar imagen 0.jpg (posición inicial)
        url_0 = f"{BASE_URL}/{filename}/0.jpg"
        url_1 = f"{BASE_URL}/{filename}/1.jpg"
        
        try:
            r0 = requests.get(url_0, timeout=10)
            if r0.status_code == 200:
                with open(local_path_0, "wb") as f:
                    f.write(r0.content)
                print(f"  OK -> {filename}/0.jpg")
            
            # También descargar frame 1 (posición final)
            r1 = requests.get(url_1, timeout=10)
            if r1.status_code == 200:
                with open(os.path.join(local_dir, "1.jpg"), "wb") as f:
                    f.write(r1.content)
            
            # Actualizar la DB con la ruta local
            rel_path = local_path_0.replace("\\", "/")
            cur.execute("UPDATE catalogo_ejercicios SET gif_local = ? WHERE id_ejercicio = ?", (rel_path, ex_id))
            ok += 1
            
            # Rate limiting gentil (1 req/100ms)
            time.sleep(0.1)
            
        except Exception as e:
            print(f"  ERROR -> {filename}: {e}")
            err += 1
    
    conn.commit()
    conn.close()
    print(f"\n[DESCARGADOR] Completado: {ok} OK | {err} errores")

def agregar_columna_local():
    """Agrega columna gif_local si no existe."""
    conn = sqlite3.connect(DB_FILE)
    try:
        conn.execute("ALTER TABLE catalogo_ejercicios ADD COLUMN gif_local TEXT")
        print("[DB] Columna gif_local agregada.")
    except Exception:
        pass  # Ya existe
    conn.commit()
    conn.close()

if __name__ == "__main__":
    agregar_columna_local()
    descargar_imagenes()
