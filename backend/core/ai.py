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

def fix_gif_url(url):
    if not url: return ""
    new_url = url
    if url.lower().endswith(".gif"):
        new_url = url.replace(".gif", ".jpg")
    elif not any(url.lower().endswith(ext) for ext in [".jpg", ".png", ".jpeg"]):
        new_url = url.rstrip("/") + "/0.jpg"
    if "raw.githubusercontent.com" in url:
        new_url = new_url.replace("raw.githubusercontent.com", "raw.githack.com")
    return new_url

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
    """Detección de intención y respuesta en un solo paso."""
    
    # Intento de respuesta local (Zen Optimization)
    local_res = procesar_mensaje_local(mensaje)
    if local_res:
        return local_res

    sys_prompt = f"Eres Vórtice Coach, experto fitness argento. Responde JSON: {{'tipo': 'chat_normal|nutricion|rutina', 'respuesta': '...'}}. Contexto: {perfil_info}. Responde con toda la onda argenta."
    
    res_raw = consultar_gemini([
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": mensaje}
    ], formato_json=True)
    
    if res_raw == "ERROR_CUOTA":
        return {"tipo": "chat_normal", "respuesta": "¡Uff! Me quedé sin aire. Google me puso un stop por exceso de consultas. ¡Dame un respiro y volvemos con todo!"}
    if res_raw in ["ERROR_KEY", "ERROR_CONFIG"]:
        return {"tipo": "chat_normal", "respuesta": "Che, hay un tema con mi llave... Revisá el archivo .env porque no puedo arrancar."}
    if not res_raw or res_raw == "ERROR_GENERICO":
        return {"tipo": "chat_normal", "respuesta": "Che, me tildé un segundo analizando tanta potencia. ¿Me repetís lo último?"}

    res = clean_json(res_raw)
    try: 
        return json.loads(res)
    except: 
        return {"tipo": "chat_normal", "respuesta": res_raw}

def generar_rutina_inteligente(objetivo, perfil_info=""):
    print(f"[VORTICE] Generando rutina para: {objetivo}")
    try:
        from .database import buscar_ejercicio_por_id, obtener_catalogo_completo
        
        # Obtener una muestra del catálogo para dar contexto a la IA
        ejercicios_todos = obtener_catalogo_completo()
        # Tomamos una muestra representativa (por ahora limitada para no exceder tokens del prompt)
        cat_str = "\n".join([f"{e.get('id_ejercicio')}|{e.get('nombre_es')}|{e.get('target')}" for e in ejercicios_todos[:150] if e.get('nombre_es')])

        sys_prompt = "Eres Vórtice Coach. Responde JSON: [{'id': 'ID', 'nombre_es': 'Nombre', 'series': 4}]. Usa español de Argentina."
        res_txt = consultar_gemini([{"role": "system", "content": sys_prompt}, {"role": "user", "content": f"Objetivo: {objetivo}. Catálogo:\n{cat_str}"}], formato_json=True)
        
        if res_txt in ["ERROR_CUOTA", "ERROR_CONFIG", "ERROR_KEY"]:
            return [], "Error de cuota o configuración en la IA."

        try:
            ej_ia = json.loads(res_txt)
            if isinstance(ej_ia, dict): ej_ia = ej_ia.get("ejercicios", [])
        except:
            return [], "La IA devolvió un formato inválido."

        rutina_final = []
        for e in ej_ia[:8]:
            row = buscar_ejercicio_por_id(e.get('id'))
            if row:
                tr = (row.get('target') or "chest").lower()
                sc = int(e.get("series", 4))
                rutina_final.append({
                    "id": row.get('id_ejercicio'), 
                    "id_ejercicio": row.get('id_ejercicio'), 
                    "nombre_es": e.get("nombre_es") or row.get('nombre_es'),
                    "target": tr, 
                    "body_part": UI_MUSCULO_ES.get(tr, tr), 
                    "gif_url": fix_gif_url(row.get('gif_url')),
                    "equipment": row.get('equipment'), 
                    "series": sc, 
                    "sets": [{"reps": "12", "kg": "", "done": False} for _ in range(sc)]
                })
        return rutina_final, "Rutina lista para darle con todo."
    except Exception as ex:
        print(f"Error rutina: {ex}")
        return [], "Error generando rutina."

def clasificar_intencion(msg):
    return {"tipo": "chat_normal", "datos": "", "suficiente_info": True}

def estimar_nutricion_ollama(alimento):
    prompt = f"Estima calorías y macros para: {alimento}. Responde JSON: {{'calorias': 0, 'proteinas': 0, 'carbos': 0, 'grasas': 0, 'descripcion': '...'}}"
    res = consultar_gemini([{"role": "user", "content": prompt}], formato_json=True)
    try: return json.loads(res)
    except: return None

def analizar_imagen_ollama(contents):
    return None

def generar_receta_alacena(perfil, ings):
    prompt = f"Con estos ingredientes: {ings}, sugiere una receta rápida argentina."
    return consultar_gemini([{"role": "user", "content": prompt}])

def sugerir_reemplazo_ia(ejercicio_actual, target):
    return None
