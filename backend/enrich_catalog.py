import os
import json
import time
import sys
from google import generativeai as genai
from core.firebase import get_db
from dotenv import load_dotenv

def log(msg):
    print(msg, flush=True)

# Cargar variables de entorno
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
log(f"[DEBUG] Buscando .env en: {dotenv_path}")
load_dotenv(dotenv_path)

# Configurar Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    log("[ERROR] No se encontró GEMINI_API_KEY en el .env")
    sys.exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-flash-latest')

def traducir_lote(lote):
    """Traduce un grupo de ejercicios en un solo pedido a Gemini."""
    ejercicios_str = json.dumps(lote, indent=2)
    prompt = (
        f"Sos un Personal Trainer experto de Buenos Aires, Argentina. "
        f"Traducí este LISTA de ejercicios a Español Argentino (usá vos, técnico pero claro). "
        f"Respondé ÚNICAMENTE un JSON que sea una LISTA de objetos con este formato exacto:\n"
        f"[\n  {{\n    'id': 'ID original',\n    'nombre_es': '...',\n    'instrucciones_es': [...],\n    'tips_es': [...],\n    'target_es': '...',\n    'equipamiento_es': '...',\n    'resumen_es': '...'\n  }}, ...\n]\n\n"
        f"Ejercicios a traducir:\n{ejercicios_str}"
    )
    
    for intento in range(3):
        try:
            log(f"   [IA] Llamando a Gemini para lote de {len(lote)}...")
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            if not text.startswith("["):
                start = text.find("[")
                end = text.rfind("]") + 1
                text = text[start:end]
            return json.loads(text)
        except Exception as e:
            if "429" in str(e):
                log(f"   [IA] Cuota alcanzada. Esperando 60s...")
                time.sleep(60)
                continue
            log(f"   [ERROR IA] {e}")
            break
    return []

def enriquecer_y_subir(limite=50):
    db = get_db()
    if not db:
        log("[ERROR] No se pudo conectar a Firestore.")
        return
    col = db.collection("catalogo_ejercicios")
    
    # Leer datos raw
    raw_path = os.path.join(base_dir, "raw_catalog.json")
    log(f"[DEBUG] Buscando raw_catalog en: {raw_path}")
    if not os.path.exists(raw_path):
        log(f"[ERROR] No existe el archivo {raw_path}")
        return
        
    with open(raw_path, "r", encoding="utf-8") as f:
        catalogo_raw = json.load(f)

    log(f"--- MOTOR DE ENRIQUECIMIENTO ---")
    log(f"Total en catlogo raw: {len(catalogo_raw)}")
    log(f"Objetivo de esta tanda: {limite}")
    
    procesados = 0
    batch_size = 5 # Bajamos a 5 para reducir timeouts de la IA y ser ultra seguros
    
    for i in range(0, len(catalogo_raw), batch_size):
        if procesados >= limite: break
        
        lote_raw = catalogo_raw[i:i+batch_size]
        log(f"\n[LOTE {i//batch_size + 1}] Revisando existencia en Firestore...")
        
        lote_a_traducir = []
        for ej in lote_raw:
            doc = col.document(ej["id"]).get()
            if not doc.exists:
                lote_a_traducir.append(ej)
            else:
                log(f"   [SKIP] {ej.get('name')} ya est en la base.")

        if not lote_a_traducir:
            continue

        log(f"   [PROCESANDO] {len(lote_a_traducir)} nuevos rumbos a la IA...")
        traducciones = traducir_lote(lote_a_traducir)
        
        if not traducciones:
            log("   [!] Fall la traduccin del lote. Saltando...")
            continue

        for trad in traducciones:
            orig = next((x for x in lote_a_traducir if x.get("id") == trad.get("id")), None)
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
                "source": "enrichment_v2_batch",
                "version": 1.1
            }
            
            col.document(orig.get("id")).set(doc_data)
            log(f"   [OK] Guardado: {trad.get('nombre_es')}")
            procesados += 1
            
        log("   [TIMEOUT] Esperando 10s para estabilizar cuota...")
        time.sleep(10)

    log(f"\n--- TANDA FINALIZADA: {procesados} ejercicios procesados ---")

if __name__ == "__main__":
    enriquecer_y_subir(50)
