# app/services/sync_service.py
import json
import os
import asyncio
from deep_translator import GoogleTranslator
from app.db.session import get_db_connection
from time import sleep

# Mapa de traducción manual para términos recurrentes (ahorra cuota y tiempo)
MANUAL_MAP = {
    # Partes del cuerpo
    "back": "Espalda", "cardio": "Cardio", "chest": "Pecho", "lower arms": "Antebrazos (Inf)",
    "lower legs": "Pantorrillas", "neck": "Cuello", "shoulders": "Hombros",
    "upper arms": "Brazos (Sup)", "upper legs": "Piernas (Sup)", "waist": "Cintura",
    # Equipamiento
    "barbell": "Barra", "dumbbell": "Mancuerna", "cable": "Cable", "body weight": "Peso Corporal",
    "kettlebell": "Pesa Rusa", "bench": "Banco", "machine": "Máquina", "leverage machine": "Máquina de Palanca",
    "assisted": "Asistido", "band": "Banda", "stability ball": "Pelota de Estabilidad", "medicine ball": "Balón Medicinal",
    "ez barbell": "Barra EZ", "rope": "Cuerda", "kettlebells": "Pesas Rusas"
}

def calculate_difficulty(equipment: str) -> str:
    eq = equipment.lower()
    if any(x in eq for x in ["body weight", "leverage", "mat"]):
        return "Easy"
    if any(x in eq for x in ["barbell", "weighted", "sled"]):
        return "Hard"
    return "Medium"

def translate_batch(texts, source='en', target='es', batch_size=20):
    """Traduce una lista de textos en bloques para ganar velocidad."""
    translator = GoogleTranslator(source=source, target=target)
    results = []
    
    # Delimitador único para no romper instrucciones
    DELIMITER = " ||| "
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        combined = DELIMITER.join(batch)
        try:
            translated = translator.translate(combined)
            parts = translated.split(DELIMITER)
            # Asegurar que tenemos el mismo número de partes
            if len(parts) == len(batch):
                results.extend([p.strip() for p in parts])
            else:
                # Fallback uno a uno si el delimitador falló
                for text in batch:
                    results.append(translator.translate(text))
        except Exception as e:
            print(f" [!] Error en batch: {e}. Reintentando uno a uno...")
            for text in batch:
                try:
                    results.append(translator.translate(text))
                except:
                    results.append(text)
        sleep(0.5) # Respetar rate limits
    return results

async def sync_exercises_offline():
    """Sincronización OFFLINE usando el volcado local y traducción masiva."""
    dump_path = os.path.join(os.getcwd(), "data", "exercisedb_dump.json")
    
    if not os.path.exists(dump_path):
        print(f"[!] Error: No se encuentra {dump_path}. Ejecuta dump_exercises.py primero.")
        return False

    with open(dump_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    print(f"\n[+] Iniciando sincronización masiva offline de {len(raw_data)} ejercicios...")
    
    # 1. Preparar textos para traducción
    names_en = [ex.get('name', '') for ex in raw_data]
    instr_en = [" ".join(ex.get('instructions', [])) for ex in raw_data]
    
    print(f"[*] Traduciendo {len(names_en)} nombres...")
    names_es = translate_batch(names_en, batch_size=25)
    
    print(f"[*] Traduciendo {len(instr_en)} bloques de instrucciones (esto puede tardar unos minutos)...")
    instr_es = translate_batch(instr_en, batch_size=10) # Menos por el tamaño de los textos

    print(f"\n[*] Guardando en base de datos...")
    
    final_data = []
    for i, ex in enumerate(raw_data):
        diff = calculate_difficulty(ex.get("equipment", ""))
        
        # Traducción de categorías usando el mapa manual
        bp_es = MANUAL_MAP.get(ex.get('bodyPart', '').lower(), ex.get('bodyPart', '').capitalize())
        target_es = MANUAL_MAP.get(ex.get('target', '').lower(), ex.get('target', '').capitalize())
        # Equipo puede ser compuesto
        eq_raw = ex.get('equipment', '')
        eq_es = MANUAL_MAP.get(eq_raw.lower(), eq_raw.capitalize())
        
        # Secundarios (lista traducida si es posible)
        sec_en = ex.get('secondaryMuscles', [])
        sec_es = " | ".join([MANUAL_MAP.get(m.lower(), m.capitalize()) for m in sec_en])

        final_data.append((
            ex.get("id"),
            names_es[i],
            bp_es,
            eq_es,
            target_es,
            sec_es,
            instr_es[i],
            ex.get("gifUrl"),
            diff
        ))

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.executemany("""
            INSERT INTO exercises (id, name, body_part, equipment, target, secondary_muscles, instructions, gif_url, difficulty_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name, body_part=excluded.body_part, equipment=excluded.equipment,
                target=excluded.target, secondary_muscles=excluded.secondary_muscles,
                instructions=excluded.instructions, gif_url=excluded.gif_url, 
                difficulty_level=excluded.difficulty_level
        """, final_data)
        conn.commit()

    print(f"\n[SUCCESS] Sincronización masiva completa. DB actualizada con {len(final_data)} ejercicios.")
    return True

if __name__ == "__main__":
    asyncio.run(sync_exercises_offline())
