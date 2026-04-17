"""
ai.py - El Cerebro de Vórtice Health (Versión Unificada v2.0)
Optimizado para google-genai (Soporte total para Vertex AI y AI Studio).
"""
import os
import json
import re
import warnings
from google import genai
from google.genai import types
from google.oauth2 import service_account
from dotenv import load_dotenv

# Ocultar ruidos de deprecación de Google
warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

from core.intelligence import recall_nutrition, learn_nutrition

# --- CONFIGURACIÓN DE MOTORES ---
MODELO_PRINCIPAL = "gemini-1.5-flash"
api_key = os.getenv("GEMINI_API_KEY")
# Buscar archivo JSON de cuenta de servicio (probamos varios nombres posibles)
JSON_POSIBLES = [
    os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey_gemini.json"),
    os.path.join(os.path.dirname(__file__), "..", "_serviceAccountKey_gemini.json"),
    os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
]
JSON_KEY_PATH = next((p for p in JSON_POSIBLES if os.path.exists(p)), None)

# Inicialización inteligente del Cliente
client = None
MODO_ACTIVO = "NINGUNO"

def inicializar_cliente():
    global client, MODO_ACTIVO
    # Intento 1: Modo Enterprise (Vertex AI vía JSON)
    if JSON_KEY_PATH:
        try:
            creds = service_account.Credentials.from_service_account_file(
                JSON_KEY_PATH,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            with open(JSON_KEY_PATH, 'r') as f:
                project_data = json.load(f)
                project_id = project_data.get("project_id")
            
            client = genai.Client(
                vertexai=True,
                project=project_id,
                location="us-central1",
                credentials=creds
            )
            MODO_ACTIVO = "ENTERPRISE (Vertex AI)"
            print(f"[VORTICE] Modo {MODO_ACTIVO} Activado - Proyecto: {project_id}")
            return
        except Exception as e:
            print(f"[VORTICE] Error en Modo Enterprise: {e}. Reintentando modo Standard...")

    # Intento 2: Modo Standard (AI Studio vía API Key)
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            MODO_ACTIVO = f"STANDARD (GenAI Key: {api_key[:4]}...)"
            print(f"[VORTICE] Modo {MODO_ACTIVO} Activado")
            return
        except Exception as e:
            print(f"[VORTICE] Error en Modo Standard: {e}")

    print("[VORTICE WARNING] No se pudo inicializar ningún motor de IA. Revisa tu .env o JSON.")

# Ejecutar inicialización al importar
inicializar_cliente()

def clean_json(text):
    """Limpia backticks de Markdown y extrae solo el bloque JSON."""
    if not text: return ""
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if match: return match.group(0)
    return text.strip()

# --- MOTOR DE IA ---
def consultar_gemini(mensajes, formato_json=False, modelo=MODELO_PRINCIPAL):
    try:
        if not client:
            inicializar_cliente()
            if not client: return "ERROR_CONFIG"

        print(f"[IA] Consultando {modelo} ({MODO_ACTIVO})...")
        
        # Traducir mensajes al formato de google-genai
        system_instruction = ""
        contents = []
        for msg in mensajes:
            role = msg.get("role", "user")
            content = str(msg.get("content", ""))
            if role == "system":
                system_instruction += content + "\n\n"
            else:
                contents.append(content)

        # Configuración de generación
        config = types.GenerateContentConfig(
            system_instruction=system_instruction if system_instruction else None,
            temperature=0.4,
            response_mime_type="application/json" if formato_json else "text/plain"
        )

        response = client.models.generate_content(
            model=modelo,
            contents=contents,
            config=config
        )
        
        return response.text
    except Exception as e:
        err_msg = str(e).lower()
        print(f"[IA ERROR]: {e}")
        if "429" in err_msg or "quota" in err_msg: return "ERROR_CUOTA"
        if "401" in err_msg or "403" in err_msg: return "ERROR_AUTENTICACION"
        return None

def consultar_ollama(mensajes, formato_json=False):
    return consultar_gemini(mensajes, formato_json)

# --- LOCALIZACIÓN ---
UI_MUSCULO_ES = {
    "abdominals": "Abdominales", "chest": "Pecho", "biceps": "Bíceps", "triceps": "Tríceps", 
    "lats": "Espalda", "lower back": "Espalda Baja", "middle back": "Espalda",
    "quadriceps": "Cuádriceps", "hamstrings": "Isquios", "calves": "Pantorrillas",
    "shoulders": "Hombros", "glutes": "Glúteos", "traps": "Trapecios", "forearms": "Antebrazo"
}

# --- FUNCIONES CORE ---
def cerebro_vortice_unificado(mensaje, perfil_info, historial_previo, contexto_vectorial=""):
    """Respuesta unificada con detección de intención."""
    # Capa de Nutrición
    if any(kw in mensaje.lower() for kw in ["comí", "comer", "cena", "almuerzo", "desayuno"]):
        memoria = recall_nutrition(mensaje)
        if memoria:
            return {
                "tipo": "nutricion",
                "respuesta": f"¡Ya me acordaba! Para {memoria['food_name']} son unas {memoria['calories']} kcal. ¿Anoto?",
                "nutricion": {"alimento": memoria['food_name'], "cal": memoria['calories'], "prot": memoria['proteins'], "carb": memoria['carbs'], "gras": memoria['fats']}
            }

    sys_prompt = (
        f"Eres Vórtice Coach, asistente fitness elite de Argentina. Usa voseo y tono motivador.\n"
        f"Responde SIEMPRE en este formato JSON:\n"
        f"{{\"tipo\": \"chat_normal\" | \"nutricion\" | \"rutina\", \"respuesta\": \"...\", \"nutricion\": {{...}}, \"rutina\": [...]}}\n"
        f"Contexto: {perfil_info}. {contexto_vectorial}"
    )
    
    res_raw = consultar_gemini([
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": mensaje}
    ], formato_json=True)
    
    if not res_raw or "ERROR" in res_raw:
        return {"tipo": "chat_normal", "respuesta": "¡Me quedé sin aire che! Google dio un error de conexión. ¡Proba en un ratito!"}
    
    try:
        data = json.loads(clean_json(res_raw))
        if data.get("tipo") == "nutricion" and data.get("nutricion"):
            learn_nutrition(mensaje, data["nutricion"])
        return data
    except:
        return {"tipo": "chat_normal", "respuesta": res_raw}

def generar_rutina_inteligente(objetivo, perfil_nombre, perfil_info=""):
    """Generar rutina usando ChromaDB (Legacy Code Support)."""
    try:
        from core.intelligence import semantic_search_exercises
        from core.database_sqlite import buscar_ejercicios_por_ids
        res = semantic_search_exercises(f"{objetivo} {perfil_info}", limit=6)
        ids = res['ids'][0] if res and res['ids'] else []
        ejercicios = buscar_ejercicios_por_ids(ids)
        
        rutina = []
        for ex in ejercicios:
            rutina.append({
                "id_ejercicio": ex.get('id_ejercicio'), 
                "nombre_es": str(ex.get('nombre_es', '')).capitalize(),
                "body_part": UI_MUSCULO_ES.get(ex.get('target', ''), 'General'),
                "gif_url": ex.get('gif_url', ''),
                "series": 4, "sets": [{"reps": "10-12", "kg": "", "done": False} for _ in range(4)]
            })
        return rutina, "¡Rutina lista! Dale con todo."
    except Exception as e:
        print(f"Error rutina: {e}")
        return [], "Error generando rutina."

def estimar_nutricion_ollama(alimento):
    prompt = f"Sé un nutricionista argento. Estima calorías y macros para: {alimento}. Responde ÚNICAMENTE JSON: {{'alimento': '...', 'calorias': 0, 'proteinas': 0, 'carbos': 0, 'grasas': 0, 'descripcion': '...'}}"
    res = consultar_gemini([{"role": "user", "content": prompt}], formato_json=True)
    try: return json.loads(clean_json(res))
    except: return None

def analizar_imagen_ollama(contents):
    return "Analizador de imágenes no disponible en esta versión."

def generar_receta_alacena(perfil, ings):
    prompt = f"Con estos ingredientes: {ings}, sugiere una receta rápida argentina con toda la onda."
    return consultar_gemini([{"role": "user", "content": prompt}])
