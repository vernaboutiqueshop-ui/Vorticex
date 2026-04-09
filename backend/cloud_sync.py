import json
import os
import time
from core.firebase import get_db

def sync_catalog_to_cloud():
    raw_path = 'raw_catalog.json'
    
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} no encontrado.")
        return

    db = get_db()
    col = db.collection("catalogo_ejercicios")
    
    with open(raw_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"--- INICIANDO SINCRONIZACIÓN CLOUD ({len(data)} ejercicios) ---")
    
    subidos = 0
    saltados = 0
    errores = 0

    for x in data:
        id_ej = x['id']
        try:
            # Verificar si ya existe para no pisar el contenido "Enriquecido/Pro"
            doc_ref = col.document(id_ej)
            doc = doc_ref.get()
            
            if doc.exists:
                # print(f"   [SKIP] {id_ej} ya existe en Firestore.")
                saltados += 1
                continue
            
            # Preparar data base para los nuevos
            doc_data = {
                "id_ejercicio": id_ej,
                "nombre_en": x['name'],
                "nombre_es": x['name'].capitalize(),
                "body_part": x['bodyPart'],
                "target": x['target'],
                "equipment": x.get('equipment', 'General'),
                "gif_url": f"/api/exercises/gif/{id_ej}", # Usar nuestro proxy seguro
                "instrucciones_en": x.get('instructions', []),
                "last_update": time.time(),
                "source": "massive_sync_v1",
                "status": "raw" # Marcamos como raw para saber que falta enriquecerlo
            }
            
            doc_ref.set(doc_data)
            subidos += 1
            if subidos % 10 == 0:
                print(f"   [PROGRESS] {subidos} ejercicios subidos...")
                
        except Exception as e:
            print(f"   [ERROR] En {id_ej}: {e}")
            errores += 1

    print(f"\n--- SINCRONIZACIÓN FINALIZADA ---")
    print(f" >> Subidos: {subidos}")
    print(f" >> Saltados (ya existían): {saltados}")
    print(f" >> Errores: {errores}")
    print(f"Total en nube: {subidos + saltados}")

if __name__ == "__main__":
    sync_catalog_to_cloud()
