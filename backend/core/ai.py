"""
ai.py - El Cerebro de Vórtice Health
Optimizado para Gemini 1.5 Flash.
"""
import os
import json
import re
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

# Ocultar ruidos de deprecación de Google para tener una consola limpia
warnings.filterwarnings("ignore", category=FutureWarning)
# Use a default encoding for print if needed, but removing emojis is safer
load_dotenv()

from core.intelligence import recall_nutrition, learn_nutrition

# --- CONFIGURACIÓN DE MODELOS ---
MODELO_PRINCIPAL = "models/gemini-flash-latest"
api_key = os.getenv("GEMINI_API_KEY", "AIzaSyBuh-W_reEPT0H90xDqBZr_VXEuGNjDCNs")
# Si es la de Gonzalo o la genérica, igual la cargamos
print(f"[VORTICE] API KEY conectada ({api_key[:4]}...{api_key[-4:]})")
genai.configure(api_key=api_key)

def clean_json(text):
    """Limpia backticks de Markdown y extrae solo el bloque JSON."""
    if not text: return ""
    # Buscar el primer '{' y el último '}' para ignorar texto extra
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if match:
        return match.group(0)
    return text.strip()

def clean_json(text):
    """Limpia backticks de Markdown y extrae solo el bloque JSON."""
    if not text: return ""
    # Buscar el primer '{' y el último '}' para ignorar texto extra
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if match:
        return match.group(0)
    return text.strip()

# --- MOTOR DE IA (Gemini) ---
def consultar_gemini(mensajes, formato_json=False, modelo=MODELO_PRINCIPAL):
    try:
        if not api_key or "AIzaSy" not in api_key:
             print("[VORTICE] Falta la GEMINI_API_KEY en el .env")
             return "ERROR_CONFIG"

        print(f"[GEMINI] Consultando {modelo}...")
        system_instruction = ""
        user_history = []
        for msg in mensajes:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                system_instruction += str(content) + "\n\n"
            else:
                user_history.append({"role": "user" if role == "user" else "model", "parts": [{"text": str(content)}]})

        gen_model = genai.GenerativeModel(
            model_name=modelo, 
            system_instruction=system_instruction if system_instruction else None,
            safety_settings={
                "HATE": "BLOCK_NONE",
                "HARASSMENT": "BLOCK_NONE",
                "SEXUAL": "BLOCK_NONE",
                "DANGEROUS": "BLOCK_NONE"
            }
        )
        generation_config = genai.GenerationConfig(
            response_mime_type="application/json" if formato_json else "text/plain", 
            temperature=0.4
        )
        res = gen_model.generate_content(user_history, generation_config=generation_config)
        
        print(f"[DEBUG IA] Respuesta cruda: {res.text[:100]}...")
        if not res.text:
            print("[DEBUG IA] La respuesta vino VACIA. Verificando candidatos...")
            if res.candidates:
                 print(f"[DEBUG IA] Candidatos encontrados: {len(res.candidates)}")
        
        return res.text
    except Exception as e:
        err_msg = str(e).lower()
        print(f"[GEMINI ERROR]: {e}")
        if "429" in err_msg or "quota" in err_msg: return "ERROR_CUOTA"
        if "401" in err_msg or "api_key" in err_msg: return "ERROR_KEY"
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

# --- FUNCIONES CORE PARA main.py ---

def procesar_mensaje_local(mensaje):
    """Detecta mensajes simples (saludos, despedidas, gracias) para responder localmente y ahorrar API calls."""
    if not mensaje: return None
    m = mensaje.lower().strip()
    
    # Saludos
    if any(s in m for s in ["hola", "buen dia", "buenas noches", "que tal", "como va", "buen día"]):
        return {"tipo": "chat_normal", "respuesta": "¡Hola, che! ¿Todo bien? Acá estoy para lo que necesites, ya sea una rutina, planear una comida o simplemente charlar. ¿Qué tenemos para hoy?"}
    
    # Despedidas
    if any(d in m for d in ["chau", "nos vemos", "hasta luego", "adios", "adiós", "mañana seguimos"]):
        return {"tipo": "chat_normal", "respuesta": "Dale, che. ¡Cuidate! Metele garra y cualquier cosa me chiflás. ¡Abrazo!"}
    
    # Agradecimientos
    if any(g in m for g in ["gracias", "genio", "capo", "buenisimo", "perfecto", "entendido", "buenísimo"]):
        return {"tipo": "chat_normal", "respuesta": "¡De nada! Un placer darte una mano. Si necesitás algo más, ya sabés dónde encontrarme. ¡A darle con todo!"}
    
    # Estado / Quien sos
    if any(q in m for q in ["quien sos", "que haces", "como estas", "cómo estás"]):
        return {"tipo": "chat_normal", "respuesta": "¡Todo tranqui por acá! Soy Vórtice Coach, tu asistente de salud argento. Te ayudo con las comidas, los entrenos y a que no aflojes nunca. ¿Vos cómo venís?"}

    return None

def cerebro_vortice_unificado(mensaje, perfil_info, historial_previo, contexto_vectorial=""):
    """Detección de intención y respuesta en un solo paso optimizado."""
    
    # --- CAPA DE APRENDIZAJE LOCAL (NUTRICHORE) ---
    es_nutricion = any(kw in mensaje.lower() for kw in ["comí", "comer", "cena", "almuerzo", "desayuno", "nutricion", "calorías"])
    if es_nutricion:
        memoria_fresca = recall_nutrition(mensaje)
        if memoria_fresca:
            print(f"[VORTICE] ¡Aprendizaje detectado! Usando memoria local para: {mensaje}")
            return {
                "tipo": "nutricion",
                "respuesta": f"¡Ya me acordaba de esto! Para {memoria_fresca['food_name']}, son unas {memoria_fresca['calories']} kcal. ¿Lo anoto?",
                "nutricion": {
                    "alimento": memoria_fresca['food_name'],
                    "cal": memoria_fresca['calories'],
                    "prot": memoria_fresca['proteins'],
                    "carb": memoria_fresca['carbs'],
                    "gras": memoria_fresca['fats']
                }
            }

    sys_prompt = (
        f"Eres Vórtice Coach, un instructor fitness elite de Argentina. Tu tono es motivador, técnico y usa voseo. "
        f"Analiza el mensaje del usuario y responde ÚNICAMENTE en JSON con este formato:\n"
        f"{{\n"
        f"  'tipo': 'chat_normal' | 'nutricion' | 'rutina',\n"
        f"  'respuesta': 'Tu respuesta motivadora en español argentino',\n"
        f"  'nutricion': {{'alimento': 'nombre', 'cal': 100, 'prot': 0, 'carb': 0, 'gras': 0}} (solo si tipo es nutricion),\n"
        f"  'datos_extra': 'Cualquier detalle relevante'\n"
        f"}}\n"
        f"Contexto del usuario: {perfil_info}"
    )
    
    res_raw = consultar_gemini([
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": mensaje}
    ], formato_json=True)
    
    if res_raw == "ERROR_CUOTA":
        return {"tipo": "chat_normal", "respuesta": "¡Me quedé sin aire! Google me puso un stop por hoy. ¡Metamosle garra y mañana seguimos con el catálogo completo!"}
    
    res = clean_json(res_raw)
    try: 
        data = json.loads(res)
        # Si la IA detectó nutrición, ¡lo aprendemos para la próxima!
        if data.get("tipo") == "nutricion" and data.get("nutricion"):
            learn_nutrition(mensaje, data["nutricion"])
            print(f"[VORTICE] Nuevo aprendizaje guardado: {mensaje}")
        return data
    except: 
        return {"tipo": "chat_normal", "respuesta": res_raw}

def generar_rutina_inteligente(objetivo, perfil_info=""):
    """Genera una rutina usando ÚNICAMENTE el catálogo local ya cosechado."""
    print(f"[VORTICE] Generando rutina PRO para: {objetivo}")
    try:
        from core.database_sqlite import obtener_catalogo_completo
        ejercicios_todos = obtener_catalogo_completo()
        if not ejercicios_todos:
            return [], "Error: Catálogo vacío."
            
        # Muestra representativa para el prompt
        cat_str = "\n".join([f"{e['id_ejercicio']}|{e['nombre_es']}" for e in ejercicios_todos[:120]])

        sys_prompt = (
            "Eres Vórtice Instructor Elite. Crea una rutina JSON con ejercicios de la lista adjunta. "
            "Responde EXACTAMENTE así: [{'id': 'ID_REAL', 'series': 4, 'reps': '12'}]. Usa el voseo argentino en tu charla."
        )
        
        res_txt = consultar_gemini([
            {"role": "system", "content": sys_prompt}, 
            {"role": "user", "content": f"Objetivo: {objetivo}. Catálogo disponible:\n{cat_str}"}
        ], formato_json=True)
        
        try:
            ej_ia = json.loads(res_txt)
            if isinstance(ej_ia, dict): ej_ia = ej_ia.get("ejercicios", [])
        except:
            return [], "Che, me dio un calambre mental. ¿Probamos de nuevo?"

        rutina_final = []
        for e in ej_ia[:8]:
            orig = next((x for x in ejercicios_todos if x['id_ejercicio'] == e.get('id')), None)
            if orig:
                sc = int(e.get("series", 4))
                rutina_final.append({
                    "id_ejercicio": orig['id_ejercicio'], 
                    "nombre_es": orig['nombre_es'].capitalize(),
                    "target": orig['target'], 
                    "body_part": UI_MUSCULO_ES.get(orig['target'], orig['target'].capitalize() if orig['target'] else "General"), 
                    "gif_url": orig['gif_url'],
                    "series": sc, 
                    "sets": [{"reps": str(e.get("reps", "12")), "kg": "", "done": False} for _ in range(sc)]
                })
        return rutina_final, "¡Rutina lista, fiera! Dale sin miedo."
    except Exception as ex:
        print(f"Error rutina: {ex}")
        return [], "Error generando rutina."

def estimar_nutricion_ollama(alimento):
    prompt = f"Sé un nutricionista argento. Estima calorías y macros para: {alimento}. Responde ÚNICAMENTE JSON: {{'alimento': '...', 'calorias': 0, 'proteinas': 0, 'carbos': 0, 'grasas': 0, 'descripcion': '...'}}"
    res = consultar_gemini([{"role": "user", "content": prompt}], formato_json=True)
    try: return json.loads(res)
    except: return None

def analizar_imagen_ollama(contents):
    return None

def generar_receta_alacena(perfil, ings):
    prompt = f"Con estos ingredientes: {ings}, sugiere una receta rápida argentina con toda la onda."
    return consultar_gemini([{"role": "user", "content": prompt}])

def sugerir_reemplazo_ia(ejercicio_actual, target, motivo=""):
    """Próxima mejora: Reemplazos usando el catálogo local."""
    return None
