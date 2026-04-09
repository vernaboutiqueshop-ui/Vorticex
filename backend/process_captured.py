import os
import json
import time
from google import generativeai as genai
from core.firebase import get_db
from dotenv import load_dotenv

load_dotenv(".env")

# Configurar Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-flash-latest')

def traducir_ejercicio(ej):
    """Traduce el ejercicio capturado al español argentino."""
    prompt = (
        f"Sos un Personal Trainer experto de Mendoza, Argentina. "
        f"Traducí este ejercicio a Español Argentino (usá vos, hablá con confianza). "
        f"Respondé ÚNICAMENTE un JSON con:\n"
        f"- nombre_es: nombre del ejercicio\n"
        f"- instrucciones_es: lista de pasos en argentino\n"
        f"- tips_es: lista de 2-3 consejos clave en argentino\n"
        f"- target_es: músculo principal en español\n"
        f"- equipamiento_es: equipo necesario en español\n"
        f"- resumen_es: un párrafo corto motivador sobre el ejercicio\n\n"
        f"Datos del ejercicio:\n{json.dumps(ej, indent=2)}"
    )
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error traduciendo {ej.get('name')}: {e}")
        return None

def main():
    db = get_db()
    if not db:
        print("Error: No hay conexion a Firestore.")
        return

    # Leer archivo capturado
    try:
        with open("captured_exercises.json", "r") as f:
            ejercicios = json.load(f)
    except Exception as e:
        print(f"Error al leer JSON: {e}")
        return

    print(f"--- PROCESANDO {len(ejercicios)} EJERCICIOS CAPTURADOS ---")
    
    col = db.collection("catalogo_ejercicios")
    
    for i, ej in enumerate(ejercicios):
        print(f"[{i+1}/{len(ejercicios)}] Traduciendo: {ej.get('name')}...")
        traduccion = traducir_ejercicio(ej)
        
        if traduccion:
            doc_data = {
                "id_ejercicio": ej.get("id"),
                "nombre_en": ej.get("name"),
                "nombre_es": traduccion.get("nombre_es"),
                "body_part": ej.get("bodyPart"),
                "target": ej.get("target"),
                "target_es": traduccion.get("target_es"),
                "equipment": ej.get("equipment"),
                "equipment_es": traduccion.get("equipamiento_es"),
                "gif_url": ej.get("gifUrl") if ej.get("gifUrl") else "", # Algunos v1 no tienen gifUrl en el root
                "instrucciones_en": ej.get("instructions"),
                "instrucciones_es": traduccion.get("instrucciones_es"),
                "tips_es": traduccion.get("tips_es"),
                "resumen_es": traduccion.get("resumen_es"),
                "last_update": time.time(),
                "source": "captured_rapidapi"
            }
            
            # Subir a Firestore
            col.document(ej.get("id")).set(doc_data)
            print(f"   [DONE] Guardado en Firebase: {traduccion.get('nombre_es')}")
        
        time.sleep(1) # Respetar cuota Gemini

    print("--- PROCESO FINALIZADO CON ÉXITO ---")

if __name__ == "__main__":
    main()
