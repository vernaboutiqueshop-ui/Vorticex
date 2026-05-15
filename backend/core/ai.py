"""
ai.py - El Cerebro de Vórtice Health (Versión Unificada v2.0)
Optimizado para google-genai (Soporte total para Vertex AI y AI Studio).
"""
import os
import json
import re
import sqlite3
import warnings
from datetime import datetime
from google import genai
from google.genai import types
from google.oauth2 import service_account
from dotenv import load_dotenv

# Ocultar ruidos de deprecación de Google
warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

from core.intelligence import recall_nutrition, learn_nutrition

# --- TRACKING DE LLAMADAS A GEMINI ---
_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "vortice_elite.db")

def _init_ai_tracking():
    """Crea la tabla de tracking si no existe."""
    try:
        with sqlite3.connect(_DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_calls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT (datetime('now', 'localtime')),
                    modelo TEXT,
                    usuario TEXT DEFAULT 'sistema',
                    prompt_chars INTEGER DEFAULT 0,
                    respuesta_chars INTEGER DEFAULT 0,
                    tokens_estimados INTEGER DEFAULT 0,
                    exito INTEGER DEFAULT 1
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"[AI TRACK] Error init: {e}")

_init_ai_tracking()

# Variables globales de tracking en memoria (para logs en tiempo real)
_ai_calls_hoy = 0
_ai_tokens_hoy = 0
_ai_usuario_actual = "sistema"  # se puede setear desde el chat router

def set_ai_usuario(usuario: str):
    """Permite al router de chat indicar qué usuario está haciendo la consulta."""
    global _ai_usuario_actual
    _ai_usuario_actual = usuario

def _registrar_llamada_ai(modelo: str, prompt: str, respuesta: str, exito: bool = True):
    """Registra cada llamada a Gemini en la DB y en memoria."""
    global _ai_calls_hoy, _ai_tokens_hoy
    prompt_chars = len(prompt) if prompt else 0
    respuesta_chars = len(respuesta) if respuesta else 0
    # Estimación: ~4 chars por token (aprox)
    tokens_estimados = (prompt_chars + respuesta_chars) // 4
    _ai_calls_hoy += 1
    _ai_tokens_hoy += tokens_estimados
    # Colores ANSI para el log
    C_CYAN = "\033[38;5;87m"
    C_YELLOW = "\033[38;5;226m"
    C_GREEN = "\033[38;5;118m"
    C_RED = "\033[38;5;196m"
    C_DIM = "\033[2m"
    C_BOLD = "\033[1m"
    R = "\033[0m"
    status_color = C_GREEN if exito else C_RED
    status_icon = "✓" if exito else "✗"
    ts = datetime.now().strftime("%H:%M:%S")
    try:
        print(
            f"{C_DIM}{ts}{R}  "
            f"{C_CYAN}AI{R}  "
            f"{C_BOLD}{modelo}{R}  "
            f"{C_DIM}user={R}{C_YELLOW}{_ai_usuario_actual}{R}  "
            f"{C_DIM}tk≈{R}{C_BOLD}{tokens_estimados}{R}  "
            f"{C_DIM}[hoy: {_ai_calls_hoy} calls / {_ai_tokens_hoy} tokens]{R}  "
            f"{status_color}{status_icon}{R}"
        )
    except UnicodeEncodeError:
        # Fallback for terminals that don't support emojis/unicode
        print(f"[{ts}] AI {modelo} user={_ai_usuario_actual} tokens={tokens_estimados} OK={exito}")
    try:
        with sqlite3.connect(_DB_PATH) as conn:
            conn.execute(
                "INSERT INTO ai_calls (modelo, usuario, prompt_chars, respuesta_chars, tokens_estimados, exito) VALUES (?, ?, ?, ?, ?, ?)",
                (modelo, _ai_usuario_actual, prompt_chars, respuesta_chars, tokens_estimados, 1 if exito else 0)
            )
            conn.commit()
    except Exception as e:
        print(f"[AI TRACK] Error guardando: {e}")

def get_ai_stats_hoy() -> dict:
    """Devuelve estadísticas de uso de Gemini para hoy."""
    try:
        with sqlite3.connect(_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            hoy = datetime.now().strftime("%Y-%m-%d")
            rows = conn.execute(
                "SELECT modelo, usuario, COUNT(*) as calls, SUM(tokens_estimados) as tokens FROM ai_calls WHERE ts LIKE ? GROUP BY modelo, usuario ORDER BY calls DESC",
                (f"{hoy}%",)
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) as calls, SUM(tokens_estimados) as tokens FROM ai_calls WHERE ts LIKE ?",
                (f"{hoy}%",)
            ).fetchone()
            ultimas = conn.execute(
                "SELECT ts, modelo, usuario, tokens_estimados, exito FROM ai_calls WHERE ts LIKE ? ORDER BY id DESC LIMIT 10",
                (f"{hoy}%",)
            ).fetchall()
            return {
                "hoy": hoy,
                "total_calls": total["calls"] or 0,
                "total_tokens": total["tokens"] or 0,
                "por_usuario": [dict(r) for r in rows],
                "ultimas_10": [dict(r) for r in ultimas]
            }
    except Exception as e:
        return {"error": str(e)}

# --- CONFIGURACIÓN DE MOTORES ---
MODELO_PRINCIPAL = "gemini-2.5-flash"
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
    # Normalizar entrada: si es un string, lo convertimos a lista de mensajes
    if isinstance(mensajes, str):
        lista_mensajes = [{"role": "user", "content": mensajes}]
    else:
        lista_mensajes = mensajes

    prompt_completo = " ".join(str(m.get("content", "")) for m in lista_mensajes if isinstance(m, dict))
    
    try:
        if not client:
            inicializar_cliente()
            if not client:
                _registrar_llamada_ai(modelo, prompt_completo, "", exito=False)
                return "ERROR_CONFIG"

        # Traducir mensajes al formato de google-genai
        system_instruction = ""
        contents = []
        for msg in lista_mensajes:
            if not isinstance(msg, dict): continue
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
        _registrar_llamada_ai(modelo, prompt_completo, response.text or "", exito=True)
        return response.text
    except Exception as e:
        err_msg = str(e).lower()
        print(f"[IA ERROR]: {e}")
        _registrar_llamada_ai(modelo, prompt_completo, str(e), exito=False)
        if "429" in err_msg or "quota" in err_msg: return "ERROR_CUOTA"
        if "401" in err_msg or "403" in err_msg: return "ERROR_AUTENTICACION"
        return f"Error de IA (verificar saldo/cuota): {str(e)}"

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

def generar_receta_alacena(perfil, ings, diet_mode=None):
    # Contexto de dieta para el prompt
    diet_context = ""
    if diet_mode:
        diet_context = f"\nIMPORTANTE: El usuario sigue una dieta de tipo: {diet_mode.upper()}."
        if diet_mode == "keto":
            diet_context += " Prioriza grasas saludables y proteínas. Evita carbohidratos, harinas y azúcares."
        elif diet_mode == "sinTACC":
            diet_context += " Asegúrate de que la receta sea 100% libre de gluten (sin trigo, avena, cebada ni centeno)."
        elif diet_mode == "paleo":
            diet_context += " Usa solo alimentos naturales (carnes, vegetales, frutas, semillas). Sin procesados ni legumbres."
        elif diet_mode == "volumen":
            diet_context += " Sugiere una receta alta en calorías y carbohidratos complejos para ganar masa muscular."
        elif diet_mode == "vegana":
            diet_context += " La receta debe ser 100% libre de productos de origen animal."

    prompt = f"""
    Actúa como un Chef Nutricionista de Élite con mucha onda.
    Ingredientes disponibles en la alacena: {ings}{diet_context}
    
    Genera una receta creativa, rápida y nutritiva usando preferentemente estos ingredientes.
    Indica:
    1. Nombre del plato (con emojis).
    2. Tiempo estimado.
    3. Breve paso a paso con estilo argentino.
    4. Por qué es ideal para el perfil del usuario y su dieta.
    
    Mantenlo conciso, motivador y con toda la onda.
    """
    return consultar_gemini([{"role": "user", "content": prompt}])


def analizar_foto_gemini(image_bytes):
    """Analyze a food photo using Gemini Vision and return nutrition estimate."""
    try:
        if not client:
            inicializar_cliente()
            if not client:
                return None

        import base64
        b64 = base64.b64encode(image_bytes).decode('utf-8')

        prompt = (
            "Sos un nutricionista argentino experto. Analizá esta foto de comida.\n"
            "Respondé ÚNICAMENTE en JSON con este formato exacto:\n"
            '{"alimento": "nombre del plato", "descripcion": "breve desc", '
            '"calorias": 0, "proteinas": 0, "carbos": 0, "grasas": 0}\n'
            "Estimá los macros lo más preciso posible para una porción normal."
        )

        config = types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                ])
            ],
            config=config
        )

        result = json.loads(clean_json(response.text))
        return result
    except Exception as e:
        print(f"[IA ERROR foto]: {e}")
        return None


def _compress_image(image_bytes: bytes, max_px: int = 1024, quality: int = 72) -> tuple[bytes, str]:
    """Redimensiona y convierte a JPEG. Retorna (bytes, mime_type)."""
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P", "CMYK"):
            img = img.convert("RGB")
        img.thumbnail((max_px, max_px), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=quality, optimize=True)
        print(f"[GROQ VISION] imagen comprimida: {len(image_bytes)//1024}KB → {out.tell()//1024}KB")
        return out.getvalue(), "image/jpeg"
    except Exception as e:
        print(f"[GROQ VISION] compresión falló ({e}), usando bytes originales")
        # Detectar MIME del original
        mime = "image/jpeg"
        if image_bytes[:4] == b"\x89PNG":
            mime = "image/png"
        elif image_bytes[:4] == b"RIFF":
            mime = "image/webp"
        return image_bytes, mime


async def analizar_foto_groq(image_bytes: bytes) -> dict | None:
    """Analiza foto de comida via Groq Vision — sin restricción geográfica."""
    import base64, httpx, os, re
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        print("[GROQ VISION] Sin GROQ_API_KEY")
        return None

    compressed, mime = _compress_image(image_bytes)
    b64 = base64.b64encode(compressed).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"

    prompt = (
        "Sos un nutricionista argentino experto. Analizá esta foto de comida. "
        "Estimá los macros TOTALES de la porción visible (no por 100g). "
        "Para una comida casera típica, sé realista: un plato de arroz con pollo "
        "ronda 400-600 kcal, no más de 800 salvo que sea una porción enorme. "
        "Respondé SOLO JSON: "
        '{"alimento": "nombre", "calorias": 0, "proteinas": 0, "carbos": 0, "grasas": 0}'
    )

    for model in ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]:
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url}}
                        ]}],
                        "max_tokens": 250,
                        "temperature": 0.2,
                    }
                )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    result = json.loads(match.group(0))
                    print(f"[GROQ VISION] {model} OK: {result}")
                    return result
            else:
                print(f"[GROQ VISION] {model} HTTP {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            print(f"[GROQ VISION] {model} excepción: {e}")

    return None
