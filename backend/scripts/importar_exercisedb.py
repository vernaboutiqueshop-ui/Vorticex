"""
SCRIPT: Importador y Descargador desde exercisedb.dev
- 1500 ejercicios con GIFs animados REALES
- API gratuita, sin key
- Descarga GIFs localmente a data/gifs/
- Usa Ollama para traducir nombres al español
- Actualiza catalogo_ejercicios en entrenador.db

Usar: python scripts/importar_exercisedb.py
"""
import os
import sys
import time
import sqlite3
import requests
import json

DATA_DIR = "data"
GIF_DIR  = os.path.join(DATA_DIR, "gifs")
DB_FILE  = os.path.join(DATA_DIR, "entrenador.db")

API_BASE    = "https://exercisedb.dev/api/v1/exercises"
GIF_BASE    = "https://static.exercisedb.dev/media"
LIMIT       = 50   # ejercicios por página
MAX_PAGES   = 30   # 30 × 50 = 1500 ejercicios (todos)
OLLAMA_URL  = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen2.5"

os.makedirs(GIF_DIR, exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# DB SETUP
# ──────────────────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ejercicios_pro (
            id          TEXT PRIMARY KEY,
            nombre_en   TEXT,
            nombre_es   TEXT,
            gif_url     TEXT,
            gif_local   TEXT,
            musculos    TEXT,
            body_part   TEXT,
            equipos     TEXT,
            musculos_2  TEXT,
            instrucciones TEXT
        )
    """)
    # Agregar columnas si no existen en tabla vieja
    for col in ["gif_local", "nombre_es", "gif_url"]:
        try:
            conn.execute(f"ALTER TABLE catalogo_ejercicios ADD COLUMN {col} TEXT")
        except Exception:
            pass
    conn.commit()
    conn.close()
    print("[DB] Tablas listas.")

# ──────────────────────────────────────────────────────────────────────────────
# TRADUCCIÓN CON OLLAMA
# ──────────────────────────────────────────────────────────────────────────────
def traducir_nombre(nombre_en):
    """Traduce nombre + músculo al español usando Ollama."""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": "Sos un traductor de ejercicios. Respondé SOLO con el nombre en español, sin explicaciones."},
                {"role": "user",   "content": f"Traduce este nombre de ejercicio al español: '{nombre_en}'"}
            ]
        }
        r = requests.post(OLLAMA_URL, json=payload, timeout=15)
        if r.status_code == 200:
            return r.json()["message"]["content"].strip().strip('"')
        return nombre_en
    except Exception:
        return nombre_en

# ──────────────────────────────────────────────────────────────────────────────
# DESCARGA GIF
# ──────────────────────────────────────────────────────────────────────────────
def descargar_gif(ex_id):
    """Descarga el GIF animado y retorna la ruta local."""
    local_path = os.path.join(GIF_DIR, f"{ex_id}.gif")
    if os.path.exists(local_path):
        return local_path
    
    url = f"{GIF_BASE}/{ex_id}.gif"
    try:
        r = requests.get(url, timeout=20)
        if r.status_code == 200:
            with open(local_path, "wb") as f:
                f.write(r.content)
            return local_path
        else:
            return None
    except Exception as e:
        print(f"  [GIF ERROR] {ex_id}: {e}")
        return None

# ──────────────────────────────────────────────────────────────────────────────
# MAIN: IMPORTAR Y DESCARGAR
# ──────────────────────────────────────────────────────────────────────────────
def importar():
    init_db()
    conn = sqlite3.connect(DB_FILE)
    
    total_ok   = 0
    total_skip = 0
    offset     = 0
    page       = 1

    print(f"[EXERCISEDB] Iniciando importación de hasta {MAX_PAGES * LIMIT} ejercicios...")
    print(f"[EXERCISEDB] GIFs animados -> {GIF_DIR}")
    print("-" * 60)

    while page <= MAX_PAGES:
        url = f"{API_BASE}?limit={LIMIT}&offset={offset}"
        print(f"\n[PAGE {page}/{MAX_PAGES}] Fetching {url}")

        try:
            r = requests.get(url, timeout=30)
            if r.status_code != 200:
                print(f"  ERROR HTTP {r.status_code}")
                break
            
            data = r.json()
            exercises = data.get("data", [])
            
            if not exercises:
                print("  Sin más ejercicios.")
                break

            for ex in exercises:
                ex_id    = ex.get("exerciseId", "")
                name_en  = ex.get("name", "")
                gif_url  = ex.get("gifUrl", "")
                muscles  = ",".join(ex.get("targetMuscles", []))
                body_part= ",".join(ex.get("bodyParts", []))
                equips   = ",".join(ex.get("equipments", []))
                muscles2 = ",".join(ex.get("secondaryMuscles", []))
                instruc  = " | ".join(ex.get("instructions", []))

                # Check si ya existe
                exists = conn.execute("SELECT id FROM ejercicios_pro WHERE id = ?", (ex_id,)).fetchone()
                if exists:
                    total_skip += 1
                    continue

                # Descargar GIF
                gif_local = descargar_gif(ex_id)

                # Traducir al español (con Ollama)
                name_es = traducir_nombre(name_en)
                print(f"  [{total_ok+1}] {name_en} → {name_es} | GIF: {'OK' if gif_local else 'FAIL'}")

                # Guardar en DB
                conn.execute("""
                    INSERT OR REPLACE INTO ejercicios_pro
                    (id, nombre_en, nombre_es, gif_url, gif_local, musculos, body_part, equipos, musculos_2, instrucciones)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (ex_id, name_en, name_es, gif_url, gif_local, muscles, body_part, equips, muscles2, instruc))
                
                total_ok += 1
                
                # Rate limiting
                time.sleep(0.05)
            
            conn.commit()
            print(f"  ✓ Página {page} procesada. Total OK: {total_ok} | Skip: {total_skip}")

        except Exception as e:
            print(f"  EXCEPTION: {e}")
        
        offset += LIMIT
        page   += 1
        time.sleep(0.2)  # amable con la API

    conn.close()
    print(f"\n[EXERCISEDB] COMPLETADO → {total_ok} nuevos | {total_skip} saltados")
    print(f"[EXERCISEDB] GIFs en: {GIF_DIR}")

# ──────────────────────────────────────────────────────────────────────────────
# MODO RÁPIDO: Solo primera página para probar
# ──────────────────────────────────────────────────────────────────────────────
def test_rapido():
    """Importa solo 10 ejercicios para verificar que funciona."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    
    url = f"{API_BASE}?limit=10&offset=0"
    print(f"[TEST] Fetching {url}")
    r = requests.get(url, timeout=30)
    data = r.json()
    
    print(f"[TEST] Estructura de API:")
    print(json.dumps(data["data"][0], indent=2))
    
    ex = data["data"][0]
    ex_id = ex["exerciseId"]
    print(f"\n[TEST] Descargando GIF de: {ex['name']} ({ex_id})")
    gif = descargar_gif(ex_id)
    print(f"[TEST] GIF local: {gif}")
    
    conn.close()

if __name__ == "__main__":
    if "--test" in sys.argv:
        test_rapido()
    else:
        importar()
