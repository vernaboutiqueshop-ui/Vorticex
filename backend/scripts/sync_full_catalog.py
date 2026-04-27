import os
import sqlite3
import requests
import json
import time
from dotenv import load_dotenv
from deep_translator import GoogleTranslator

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "vortice_elite.db")
GIFS_DIR = os.path.join(BASE_DIR, "data", "exercises", "gifs")

# Cargar API Key
load_dotenv(os.path.join(BASE_DIR, ".env"))
API_KEY = os.getenv("RAPIDAPI_KEY")
API_HOST = "exercisedb.p.rapidapi.com"

translator = GoogleTranslator(source='en', target='es')

def translate_safe(text):
    if not text: return ""
    try:
        return translator.translate(text)
    except:
        return text

def download_gif(url, exercise_id):
    path = os.path.join(GIFS_DIR, f"{exercise_id}.gif")
    if os.path.exists(path):
        return f"/exercises/gifs/{exercise_id}.gif"
    
    try:
        response = requests.get(url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=128):
                    f.write(chunk)
            return f"/exercises/gifs/{exercise_id}.gif"
    except Exception as e:
        print(f"  [ERROR] No se pudo bajar GIF {exercise_id}: {e}")
    return ""

def sync():
    print(f"🚀 Iniciando Sincronización Total de ExerciseDB...")
    
    if not API_KEY:
        print("❌ ERROR: No se encontró RAPIDAPI_KEY en el .env")
        return

    # 1. Obtener ejercicios de la API
    print("📡 Consultando ExerciseDB (esto puede tardar)...")
    url = f"https://{API_HOST}/exercises"
    headers = {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }
    params = {"limit": "1500"} # Pedimos todo el catálogo
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        api_exercises = response.json()
        print(f"✅ Se encontraron {len(api_exercises)} ejercicios en la API.")
    except Exception as e:
        print(f"❌ Error al conectar con la API: {e}")
        return

    # 2. Conectar a DB local y ver qué falta
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM exercises")
    existing_ids = {row[0] for row in cursor.fetchall()}
    print(f"📊 Tienes {len(existing_ids)} ejercicios locales.")

    new_exercises = [ex for ex in api_exercises if str(ex['id']) not in existing_ids]
    print(f"🆕 Hay {len(new_exercises)} ejercicios nuevos para procesar.")

    if not new_exercises:
        print("🙌 ¡Ya tienes todo el catálogo sincronizado!")
        return

    # 3. Procesar e Insertar
    count = 0
    batch_size = 50 # Procesamos de a 50 para no morir en el intento
    
    for ex in new_exercises[:batch_size]: # Limitamos a 50 por ejecución para seguridad
        eid = str(ex['id'])
        print(f"📦 [{count+1}/{batch_size}] Procesando: {ex['name']}...")
        
        # Traducciones
        name_es = translate_safe(ex['name']).capitalize()
        body_part_es = translate_safe(ex['bodyPart']).capitalize()
        equipment_es = translate_safe(ex['equipment']).capitalize()
        target_es = ex['target'] # Los targets solemos dejarlos en inglés o mapearlos
        
        # Secundarios e Instrucciones (vienen como listas)
        secondary = " | ".join(ex.get('secondaryMuscles', []))
        instructions = json.dumps([translate_safe(i) for i in ex.get('instructions', [])])
        
        # GIF
        download_gif(ex['gifUrl'], eid)
        
        # Insertar
        try:
            cursor.execute("""
                INSERT INTO exercises (id, name, body_part, equipment, target, secondary_muscles, instructions, gif_url, difficulty_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (eid, name_es, body_part_es, equipment_es, target_es, secondary, instructions, f"/gifs/{eid}.gif", "Medium"))
            conn.commit()
            count += 1
        except Exception as e:
            print(f"  [ERROR] Error al insertar {eid}: {e}")
            conn.rollback()

    conn.close()
    print(f"\n✨ ¡Sincronización terminada! Se agregaron {count} ejercicios nuevos.")
    print(f"Tip: Vuelve a correr el script para procesar los siguientes {batch_size}.")

if __name__ == "__main__":
    sync()
