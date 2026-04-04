import sqlite3
import requests
import os
import json

DB_FILE = os.path.join("data", "entrenador.db")
# Fuente: Dataset consolidado de yuhonas/free-exercise-db (Más estable)
DATA_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"

TRADUCCIONES = {
    "bodyPart": {
        "back": "Espalda", "cardio": "Cardio", "chest": "Pecho", 
        "lower arms": "Antebrazo", "lower legs": "Pierna Inferior",
        "neck": "Cuello", "shoulders": "Hombros", "upper arms": "Brazos",
        "upper legs": "Piernas (Muslos)", "waist": "Cintura/Core"
    },
    "target": {
        "abs": "Abdominales", "quads": "Cuádriceps", "lats": "Dorsales",
        "pectorals": "Pectorales", "glutes": "Glúteos", "hamstrings": "Isquiotibiales",
        "triceps": "Tríceps", "biceps": "Bíceps", "delts": "Deltoides",
        "calves": "Pantorrillas", "cardiovascular system": "Sistema Cardiovascular"
    }
}

def traducir(dicc, categoria, valor):
    return dicc.get(categoria, {}).get(valor.lower(), valor.capitalize())

def importar_pro():
    print("Iniciando descarga del catalogo profesional mirror yuhonas...")
    try:
        response = requests.get(DATA_URL, timeout=30)
        # Limpiamos posibles BOM o espacios raros
        content = response.content.decode('utf-8-sig')
        ejercicios = json.loads(content)
        
        print(f"Descargados {len(ejercicios)} ejercicios. Procesando traducciones...")
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Asegurar que la tabla existe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS catalogo_ejercicios (
                id_ejercicio TEXT PRIMARY KEY,
                nombre_es TEXT,
                nombre_en TEXT,
                body_part TEXT,
                target TEXT,
                equipment TEXT,
                gif_url TEXT,
                instrucciones_es TEXT
            )
        ''')
        
        # Limpiar catalogo previo
        cursor.execute("DELETE FROM catalogo_ejercicios")
        
        for ex in ejercicios:
            id_ex = ex.get('id', ex.get('name', 'ID_DESCONOCIDO'))
            nombre_en = ex.get('name', 'Nombre Desconocido') or 'Nombre Desconocido'
            nombre_es = nombre_en.capitalize()
            # Mapeo de categorías
            bp = traducir(TRADUCCIONES, "bodyPart", ex.get('bodyPart', ex.get('category', '')))
            target = traducir(TRADUCCIONES, "target", ex.get('primaryMuscles', [''])[0])
            equip_val = ex.get('equipment', 'Propio peso') or 'Propio peso'
            equip = equip_val.capitalize()
            # Imágenes/GIFs
            img_rel = ex.get('images', [])
            gif = f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{img_rel[0]}" if img_rel else ""
            inst = " | ".join(ex.get('instructions', [])) if isinstance(ex.get('instructions'), list) else ""
            
            cursor.execute('''
                INSERT OR REPLACE INTO catalogo_ejercicios 
                (id_ejercicio, nombre_es, nombre_en, body_part, target, equipment, gif_url, instrucciones_es)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (id_ex, nombre_es, nombre_en, bp, target, equip, gif, inst))
            
        conn.commit()
        count = cursor.execute("SELECT count(*) FROM catalogo_ejercicios").fetchone()[0]
        conn.close()
        
        print(f"Exito: {count} ejercicios importados y traducidos correctamente desde el espejo estable.")
        
    except Exception as e:
        print(f"Error en la importacion: {e}")

if __name__ == "__main__":
    importar_pro()
