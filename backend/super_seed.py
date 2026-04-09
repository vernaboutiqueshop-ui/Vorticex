import os
import json
import time
from google import generativeai as genai
from core.exercisedb_service import ExerciseDBService
from core.firebase import get_db
from dotenv import load_dotenv

# Cargar variables de entorno desde la carpeta backend
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path)

# Configurar Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-flash-latest')

def traducir_lote_ejercicios(lote):
    """Traduce un grupo de ejercicios en un solo pedido a Gemini para ahorrar cuota."""
    ejercicios_str = json.dumps(lote, indent=2)
    prompt = (
        f"Sos un Personal Trainer experto de Mendoza, Argentina. "
        f"Traducí este LISTA de ejercicios a Español Argentino (usá vos, técnico pero claro). "
        f"Respondé ÚNICAMENTE un JSON que sea una LISTA de objetos con este formato exacto:\n"
        f"[\n  {{\n    'id': 'ID original',\n    'nombre_es': '...',\n    'instrucciones_es': [...],\n    'tips_es': [...],\n    'target_es': '...',\n    'equipamiento_es': '...',\n    'resumen_es': '...'\n  }}, ...\n]\n\n"
        f"Ejercicios a traducir:\n{ejercicios_str}"
    )
    
    for intento in range(3):
        try:
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            # Limpiar posibles caracteres extra
            if not text.startswith("["):
                start = text.find("[")
                end = text.rfind("]") + 1
                text = text[start:end]
            return json.loads(text)
        except Exception as e:
            if "429" in str(e):
                print(f"   [IA] Límite alcanzado en el lote. Esperando 60s...")
                time.sleep(60)
                continue
            print(f"Error en lote: {e}")
            break
    return []

def ejecutar_super_seed(cantidad=50):
    """Descarga, traduce por lotes y sube ejercicios a Firestore."""
    db = get_db()
    col = db.collection("catalogo_ejercicios")
    
    print(f"--- INICIANDO SUPER-SEED MASIVO ({cantidad} ejercicios) ---")
    ejercicios_raw = ExerciseDBService.get_all_exercises(limit=cantidad)
    
    if not ejercicios_raw:
        print("No se obtuvieron ejercicios.")
        return

    print(f"Procesando {len(ejercicios_raw)} ejercicios en lotes de 5...")
    
    # Procesar en lotes de 5
    for i in range(0, len(ejercicios_raw), 5):
        lote = ejercicios_raw[i:i+5]
        print(f"Traduciendo lote {i//5 + 1}...")
        
        traducciones = traducir_lote_ejercicios(lote)
        
        for trad in traducciones:
            # Buscar el original para combinar datos (GIFs, etc)
            orig = next((x for x in lote if x.get("id") == trad.get("id")), None)
            if not orig: continue
            
            doc_data = {
                "id_ejercicio": orig.get("id"),
                "nombre_en": orig.get("name"),
                "nombre_es": trad.get("nombre_es"),
                "body_part": orig.get("bodyPart"),
                "target": orig.get("target"),
                "target_es": trad.get("target_es"),
                "equipment": orig.get("equipment"),
                "equipment_es": trad.get("equipamiento_es"),
                "gif_url": orig.get("gifUrl"),
                "instrucciones_en": orig.get("instructions"),
                "instrucciones_es": trad.get("instrucciones_es"),
                "tips_es": trad.get("tips_es"),
                "resumen_es": trad.get("resumen_es"),
                "last_update": time.time(),
                "source": "exercise_db_batch"
            }
            
            col.document(orig.get("id")).set(doc_data)
            print(f"   [OK] Guardado: {trad.get('nombre_es')}")
        
        # Un pequeño respiro entre lotes
        time.sleep(5)

    print("--- SUPER-SEED FINALIZADO CON ÉXITO ---")

if __name__ == "__main__":
    ejecutar_super_seed(50)
