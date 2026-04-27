import os
import sqlite3
import requests
import json
import time
from dotenv import load_dotenv
from deep_translator import GoogleTranslator

# Configuracion de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "vortice_elite.db")
GIFS_DIR = os.path.join(BASE_DIR, "data", "exercises", "gifs")

# Cargar API Key
load_dotenv(os.path.join(BASE_DIR, ".env"))
API_KEY = os.getenv("RAPIDAPI_KEY")
API_HOST = "exercisedb.p.rapidapi.com"

translator = GoogleTranslator(source='en', target='es')

BODY_PART_MAP = {
    'back': 'Espalda', 'cardio': 'Cardio', 'chest': 'Pecho',
    'lower arms': 'Brazos', 'lower legs': 'Piernas', 'neck': 'Espalda',
    'shoulders': 'Hombros', 'upper arms': 'Brazos', 'upper legs': 'Piernas',
    'waist': 'Abdominales'
}

DIFFICULTY_MAP = {
    'beginner': 'Easy', 'intermediate': 'Medium', 'advanced': 'Hard'
}

def translate_safe(text):
    if not text: return ""
    try:
        if isinstance(text, list): text = ". ".join(text)
        return translator.translate(text)
    except: return str(text)

def download_gif_v22(exercise_id):
    path = os.path.join(GIFS_DIR, f"{exercise_id}.gif")
    if os.path.exists(path): return True
    url = "https://exercisedb.p.rapidapi.com/image"
    headers = {"X-RapidAPI-Key": API_KEY, "X-RapidAPI-Host": API_HOST}
    params = {"exerciseId": exercise_id, "resolution": "180"}
    try:
        response = requests.get(url, headers=headers, params=params, stream=True, timeout=20)
        if response.status_code == 200:
            with open(path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024):
                    f.write(chunk)
            return True
        return False
    except: return False

def sync():
    print("Vorticex Turbo Dumper - Tramo Final")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM exercises")
    existing_ids = {row[0] for row in cursor.fetchall()}
    current_count = len(existing_ids)
    print(f"Locales actuales: {current_count}")

    # OPTIMIZACION: Empezar desde el ultimo bloque de 10 conocido
    current_offset = (current_count // 10) * 10
    limit_per_request = 10
    total_added = 0
    max_to_sync = 400 # Suficiente para terminar los 1,327
    
    print(f"Iniciando desde offset {current_offset}...")
    
    while total_added < max_to_sync:
        headers = {"X-RapidAPI-Key": API_KEY, "X-RapidAPI-Host": API_HOST}
        params = {"limit": str(limit_per_request), "offset": str(current_offset)}
        
        try:
            res = requests.get(f"https://{API_HOST}/exercises", headers=headers, params=params)
            res.raise_for_status()
            batch = res.json()
            if not batch: break
            
            for ex in batch:
                eid = str(ex['id'])
                if eid in existing_ids: continue
                
                print(f"[{current_count + total_added + 1}] Agregando: {ex['name']} (#{eid})")
                
                name_es = translate_safe(ex['name']).capitalize()
                raw_body_part = ex.get('bodyPart', '').lower()
                body_es = BODY_PART_MAP.get(raw_body_part, translate_safe(raw_body_part).capitalize())
                equip_es = translate_safe(ex['equipment']).capitalize()
                target = ex.get('target', 'General')
                desc_es = translate_safe(ex.get('description', ''))
                diff_raw = ex.get('difficulty', 'intermediate').lower()
                difficulty = DIFFICULTY_MAP.get(diff_raw, 'Medium')
                inst_json = json.dumps([translate_safe(i) for i in ex.get('instructions', [])])
                
                if download_gif_v22(eid):
                    cursor.execute("""
                        INSERT INTO exercises (id, name, body_part, equipment, target, instructions, description, gif_url, difficulty_level)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (eid, name_es, body_es, equip_es, target, inst_json, desc_es, f"/gifs/{eid}.gif", difficulty))
                    conn.commit()
                    total_added += 1
                    existing_ids.add(eid)
                
                if total_added >= max_to_sync: break
            
            current_offset += limit_per_request
            time.sleep(1.2)
            
        except Exception as e:
            print(f"Error: {e}")
            break

    conn.close()
    print(f"Sincronizacion terminada. Total: {len(existing_ids)}")

if __name__ == "__main__":
    sync()
