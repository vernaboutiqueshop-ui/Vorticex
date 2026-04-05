import requests
import json
import base64
import datetime
import sqlite3
from .config import OLLAMA_URL, MODELO_IA, MODELO_RAPIDO, MODELO_VISION, PERSONALIDAD_BASE, DB_FILE

def consultar_ollama(mensajes, formato_json=False, modelo=MODELO_IA):
    """Envía mensajes a Ollama y retorna la respuesta de texto."""
    print(f"\n🚀 [OLLAMA] Enviando consulta al modelo '{modelo}'...")
    if formato_json: print("   -> (Modo extracción JSON activado)")
    
    payload = {"model": modelo, "messages": mensajes, "stream": False}
    if formato_json: payload["format"] = "json"
    
    timeout_val = 90 if modelo == MODELO_VISION else 60
    
    try:
        t0 = datetime.datetime.now()
        response = requests.post(OLLAMA_URL, json=payload, timeout=timeout_val)
        t1 = datetime.datetime.now()
        
        raw_res = response.json()
        print(f"DEBUG OLLAMA [STATUS {response.status_code} | Tiempo: {(t1-t0).total_seconds():.1f}s]")
        
        return raw_res["message"]["content"]
    except Exception as e: 
        print(f"❌ [OLLAMA ERROR] Falló la API local: {e}")
        return "⚠️ No me puedo conectar con Ollama. Asegurate de que esté corriendo."


def clasificar_intencion(mensaje):
    """
    Clasifica la intención del usuario en: rutina, nutricion, alacena, o chat_normal.
    Devuelve un dict con {tipo, datos, suficiente_info}.
    """
    prompt = f"""Analiza este mensaje de un usuario de una app de fitness y salud:
"{mensaje}"

Clasificá la intención en UNA de estas categorías:
- "rutina": quiere que le armen/sugieran una rutina de ejercicios o entrenamiento
- "nutricion": menciona comida que comió o quiere saber calorías de un plato
- "alacena": quiere agregar productos a su alacena (ej: "compré huevos", "agregá leche")
- "chat_normal": saludos, preguntas generales, o cualquier otra cosa.

Responde ÚNICAMENTE con un JSON así:
{{"tipo": "rutina|nutricion|alacena|chat_normal", "datos": "resumen de lo que quiere", "suficiente_info": true/false}}

- suficiente_info: false si el pedido es muy vago (ej: "rutina" a secas).
- suficiente_info: true si hay datos (ej: "rutina de pierna").
"""

    try:
        res = consultar_ollama(
            [{"role": "user", "content": prompt}], 
            formato_json=True, 
            modelo=MODELO_RAPIDO
        )
        # Limpieza básica de la respuesta por si el modelo agrega texto
        res_clean = res.strip()
        if "```json" in res_clean:
            res_clean = res_clean.split("```json")[1].split("```")[0].strip()
        elif "```" in res_clean:
            res_clean = res_clean.split("```")[1].split("```")[0].strip()
            
        data = json.loads(res_clean)
        print(f"🎯 [INTENCIÓN] tipo={data.get('tipo')} | info_ok={data.get('suficiente_info')}")
        return data
    except Exception as e:
        print(f"⚠️ [INTENCIÓN ERROR] {e} | Raw: {res if 'res' in locals() else 'N/A'}")
        return {"tipo": "chat_normal", "datos": "", "suficiente_info": True}


def generar_rutina_inteligente(objetivo, perfil_info=""):
    """
    Genera una rutina de ejercicios y la matchea con el catálogo SQLite.
    Retorna lista de ejercicios con sus datos del catálogo.
    """
    # 1. Pedir nombres de ejercicios a la IA
    prompt = f"""Actúa como coach fitness profesional de Mendoza. 
Contexto del usuario: {perfil_info}
Objetivo de la rutina: {objetivo}

Genera una rutina de 5-8 ejercicios óptimos para ese objetivo.
Responde SOLO con un JSON: {{"ejercicios": ["nombre1", "nombre2", ...], "explicacion": "un párrafo corto explicando la rutina y por qué elegiste esos ejercicios"}}
Usa nombres genéricos en español (ej: "press de banca", "sentadilla", "curl de bíceps", "remo con barra").
No agregues nada más."""

    try:
        res = consultar_ollama(
            [{"role": "user", "content": prompt}], 
            formato_json=True, 
            modelo=MODELO_IA
        )
        data = json.loads(res.replace("```json", "").replace("```", "").strip())
        nombres_ia = data.get("ejercicios", [])
        explicacion = data.get("explicacion", "")
    except Exception as e:
        print(f"❌ [RUTINA IA] Error: {e}")
        return [], "No pude generar la rutina. Intentá de nuevo."

    # 2. Matchear con catálogo SQLite
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id_ejercicio, nombre_es, body_part, target, gif_url, nombre_en FROM catalogo_ejercicios")
        catalogo = cursor.fetchall()
        conn.close()
    except:
        catalogo = []
    
    rutina_final = []
    for nombre_ia in nombres_ia:
        nombre_lower = nombre_ia.lower().strip()
        best_match = None
        best_score = 0
        
        for cat in catalogo:
            cat_nombre = (cat[1] or "").lower()
            # Score por coincidencia de palabras
            palabras_ia = set(nombre_lower.split())
            palabras_cat = set(cat_nombre.split())
            coincidencias = len(palabras_ia & palabras_cat)
            
            # Bonus si contiene la palabra principal
            if nombre_lower in cat_nombre or cat_nombre in nombre_lower:
                coincidencias += 3
            
            if coincidencias > best_score:
                best_score = coincidencias
                best_match = cat
        
        if best_match and best_score >= 1:
            rutina_final.append({
                "id_ejercicio": best_match[0],
                "nombre_es": best_match[1],
                "body_part": best_match[2],
                "target": best_match[3],
                "gif_url": best_match[4] or None,
                "sets": [{"reps": "", "kg": "", "done": False} for _ in range(3)]
            })
        else:
            rutina_final.append({
                "id_ejercicio": f"custom_{hash(nombre_ia)}",
                "nombre_es": nombre_ia.title(),
                "body_part": "Generado IA",
                "target": "Varios",
                "sets": [{"reps": "", "kg": "", "done": False} for _ in range(3)]
            })
    
    return rutina_final, explicacion


def estimar_nutricion_ollama(alimento):
    """Estima macros de un alimento o plato descrito en texto."""
    print(f"\n🔄 [MOTOR NUTRICIONAL IA] Analizando: '{alimento}'")
    prompt = f"""
    Actuá como un experto en nutrición de Mendoza. 
    Estimá con precisión las macros y calorías de: '{alimento}'. 
    Si la consulta usa medidas típicas mendocinas (ej: "un lomo", "una empanada", "un kilo de asado"), adaptá los valores a esa cantidad exacta.
    Respondé ÚNICAMENTE con un JSON. Claves: calorias (int), proteinas (int), carbos (int), grasas (int), descripcion (string con el nombre del plato y cantidad asumida).
    No agregues nada más ni backticks.
    """
    
    res = consultar_ollama([{"role": "user", "content": prompt}], formato_json=True)
    try:
        d = json.loads(res.replace("```json", "").replace("```", "").strip())
        return {
            "alimento": alimento.capitalize(),
            "calorias": int(d.get('calorias', 0)),
            "proteinas": int(d.get('proteinas', 0)),
            "carbos": int(d.get('carbos', 0)),
            "grasas": int(d.get('grasas', 0)),
            "descripcion": d.get('descripcion', alimento)
        }
    except Exception as e:
        print(f"❌ [OLLAMA PARSE ERROR] El JSON rebotó: {e}")
        return None


def analizar_imagen_ollama(imagen_bytes):
    """Analiza una foto de comida con llava y devuelve macros estimadas."""
    print(f"\n📸 [VÓRTICE VISION] Analizando foto con llava...")
    base64_img = base64.b64encode(imagen_bytes).decode('utf-8')
    prompt = """
    Sos un Coach de Mendoza. Analizá esta foto de la comida.
    Respondé ÚNICAMENTE con un JSON con estas claves:
    - alimento: string (nombre claro del plato)
    - calorias: int
    - proteinas: int
    - carbos: int
    - grasas: int
    - descripcion: string (observación profesional evaluando si es sano o no)
    No agregues backticks ni formato markdown. Solo el JSON.
    """
    mensajes = [{"role": "user", "content": prompt, "images": [base64_img]}]
    res = consultar_ollama(mensajes, formato_json=True, modelo=MODELO_VISION)
    try:
        d = json.loads(res.replace("```json", "").replace("```", "").strip())
        return {
            "alimento": d.get("alimento", "Plato Misterioso"),
            "calorias": int(d.get("calorias", 0)),
            "proteinas": int(d.get("proteinas", 0)),
            "carbos": int(d.get("carbos", 0)),
            "grasas": int(d.get("grasas", 0)),
            "descripcion": d.get("descripcion", "No pude analizar bien la imagen.")
        }
    except Exception as e:
        print(f"❌ [LLAVA PARSE ERROR] El JSON rebotó: {e}")
        return None


def generar_receta_alacena(perfil, ingredientes):
    """Genera una receta corta usando los ingredientes de la alacena del usuario."""
    prompt = f"""Sos un coach de nutrición empático y creativo.
Ingredientes que el usuario tiene en casa: {ingredientes}

Tu objetivo es sugerir combinaciones lógicas y "humanas" de estos ingredientes.
No intentes meter todos los ingredientes en un solo plato si no combinan bien.
Puedes sugerir agregar 1 o 2 ingredientes básicos que NO estén en la lista si son esenciales para completar un plato (ej: huevos, aceite, sal, un lácteo básico).

Formato de respuesta:
Presenta 1 o 2 opciones de platos/snacks claros.
Para cada opción usa este formato:

**[Nombre del plato]**
⏱️ [X] min | 🍽️ [X] porción
*Ingredientes principales:* (lista breve)
*Preparación:* (máximo 3 pasos muy cortos)
🔥 [cals]kcal aprox

Sé breve, directo y alentador. No incluyas introducciones largas."""
    return consultar_ollama([{"role": "user", "content": prompt}])



def estimar_calorias_ingrediente(ingrediente):
    """Estima calorías aproximadas de un ingrediente suelto para la alacena."""
    prompt = f"""
    Estima las calorías aproximadas por cada 100g o por unidad (lo que sea más lógico) de: '{ingrediente}'.
    Responde UNICAMENTE con un número entero que represente las calorías.
    Si no sabes o es imposible, responde "0".
    """
    res = consultar_ollama([{"role": "user", "content": prompt}], modelo=MODELO_RAPIDO)
    try:
        # Extraer solo los dígitos
        import re
        nums = re.findall(r'\d+', res)
        return int(nums[0]) if nums else 0
    except:
        return 0
