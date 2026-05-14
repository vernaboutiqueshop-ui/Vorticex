"""
nutrition_search.py - Motor de búsqueda híbrido de alimentos
Pipeline: SQLite cache → Semántico (fastembed) → Open Food Facts → Groq IA
"""
import json
import os
import re
import httpx
import numpy as np
from core.database import buscar_alimentos_cache, guardar_alimento_cache
from core.ai import estimar_nutricion_ollama

# ── Modelo fastembed (lazy loading — solo se carga cuando se necesita) ──
_embed_model = None
_embed_model_loading = False

MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5-Q"

def _get_embed_model():
    global _embed_model, _embed_model_loading
    if _embed_model is not None:
        return _embed_model
    if _embed_model_loading:
        return None
    try:
        _embed_model_loading = True
        from fastembed import TextEmbedding
        _embed_model = TextEmbedding(MODEL_NAME)
        print("[NUTRITION] Modelo fastembed listo")
    except Exception as e:
        print(f"[NUTRITION] fastembed no disponible: {e}")
        _embed_model = None
    finally:
        _embed_model_loading = False
    return _embed_model


def normalizar_a_100g(cal, prot, carb, fat, fibra=0, porcion_g=100):
    if porcion_g <= 0:
        porcion_g = 100
    factor = 100.0 / porcion_g
    return {
        "cal_100": round(cal * factor, 1),
        "prot_100": round(prot * factor, 1),
        "carb_100": round(carb * factor, 1),
        "fat_100": round(fat * factor, 1),
        "fibra_100": round(fibra * factor, 1),
    }


# ── Sinónimos argentinos ──
_SINONIMOS = {
    "milanga": "milanesa", "mila": "milanesa", "milangas": "milanesa",
    "bondi": "colectivo",  # por si acaso
    "bondiola": "bondiola de cerdo",
    "matambre": "matambre de cerdo",
    "vacío": "asado de tira",
    "fritas": "papa frita",
    "papas fritas": "papa frita",
    "fideos": "pasta",
    "tallarines": "espaguetis",
    "manteca": "mantequilla",
    "choclo": "maíz",
    "zapallo": "calabaza",
    "poroto": "frijol",
    "arveja": "guisante",
    "morrón": "pimiento",
    "durazno": "melocotón",
    "ananá": "piña",
    "frutilla": "fresa",
    "damasco": "albaricoque",
    "crema": "nata",
    "queso crema": "queso crema",
    "palta": "aguacate",
    "bife": "filete de res",
    "asado": "costillas de res",
    "choripán": "chorizo pan",
    "medialunas": "croissant",
    "facturas": "medialunas",
    "alfajor": "galleta dulce rellena",
    "mate": "yerba mate",
    "gaseosa": "refresco",
    "soda": "agua con gas",
    "vitel toné": "ternera atún",
    "chipá": "pan de queso",
    "locro": "guiso de maíz",
    "humita": "tamales maíz",
    "carbonada": "guiso de carne",
    "puchero": "cocido de carne",
    "milanesa napolitana": "milanesa con salsa tomate queso",
    "suprema": "pechuga de pollo empanada",
    "cuadril": "lomo de res",
    "nalga": "nalga de res",
    "paleta": "paleta de cerdo",
    "peceto": "redondo de res",
    "osobuco": "ossobuco",
    "chinchulín": "intestino de res",
    "morcilla": "morcilla de cerdo",
}

def _normalizar(query: str) -> str:
    q = query.strip().lower()
    return _SINONIMOS.get(q, q)


# ── Búsqueda semántica con fastembed ──
def _buscar_semantico(query: str, perfil: str, limit: int = 8) -> list:
    """Cosine similarity contra embeddings pre-computados en SQLite."""
    model = _get_embed_model()
    if model is None:
        return []

    try:
        from core.database_sqlite import get_conn
        import sqlite3

        # Prefijo "search_query:" requerido por nomic-embed para retrieval
        q_emb = np.array(list(model.embed([f"search_query: {query}"]))[0], dtype=np.float32)
        q_norm = np.linalg.norm(q_emb)
        if q_norm == 0:
            return []

        conn = get_conn()
        cur = conn.cursor()

        # Buscar usuario para incluir sus alimentos privados
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        uid = user["id"] if user else -1

        # Cargar todos los embeddings
        rows = cur.execute("""
            SELECT id, nombre, nombre_en, cal_100, prot_100, carb_100, fat_100, fibra_100, source, embedding
            FROM alimentos_cache
            WHERE (user_id IS NULL OR user_id = ?)
              AND embedding IS NOT NULL
        """, (uid,)).fetchall()
        conn.close()

        if not rows:
            return []

        # Cosine similarity vectorizado con numpy (muy rápido)
        similitudes = []
        for row in rows:
            db_emb = np.frombuffer(row["embedding"], dtype=np.float32)
            db_norm = np.linalg.norm(db_emb)
            if db_norm == 0:
                continue
            sim = float(np.dot(q_emb, db_emb) / (q_norm * db_norm))
            similitudes.append((sim, row))

        similitudes.sort(key=lambda x: x[0], reverse=True)

        # Umbral calibrado para nomic-embed: ES correcto 0.69-0.76, EN falso max 0.66
        resultados = []
        for sim, row in similitudes[:limit]:
            if sim < 0.68:
                break
            resultados.append({
                "nombre": row["nombre"],
                "nombre_en": row["nombre_en"] or row["nombre"],
                "marca": "",
                "cal_100": row["cal_100"],
                "prot_100": row["prot_100"],
                "carb_100": row["carb_100"],
                "fat_100": row["fat_100"],
                "fibra_100": row["fibra_100"],
                "source": f"semantic:{round(sim*100)}%",
            })

        return resultados

    except Exception as e:
        print(f"[NUTRITION] Error búsqueda semántica: {e}")
        return []


def _parse_off_product(product: dict) -> dict | None:
    nutr = product.get("nutriments", {})
    cal = nutr.get("energy-kcal_100g", nutr.get("energy-kcal", 0))
    prot = nutr.get("proteins_100g", nutr.get("proteins", 0))
    carb = nutr.get("carbohydrates_100g", nutr.get("carbohydrates", 0))
    fat = nutr.get("fat_100g", nutr.get("fat", 0))
    fibra = nutr.get("fiber_100g", nutr.get("fiber", 0))
    nombre = product.get("product_name", "").strip()
    if not nombre:
        return None
    return {
        "nombre": nombre,
        "nombre_en": nombre,
        "marca": (product.get("brands", "") or "").split(",")[0].strip(),
        "cal_100": round(float(cal or 0), 1),
        "prot_100": round(float(prot or 0), 1),
        "carb_100": round(float(carb or 0), 1),
        "fat_100": round(float(fat or 0), 1),
        "fibra_100": round(float(fibra or 0), 1),
        "barcode": product.get("code", ""),
        "source": "openfoodfacts",
    }


def _es_dato_valido(food: dict) -> bool:
    """Descarta entradas con datos nutricionales claramente incorrectos."""
    cal = food.get("cal_100", 0)
    prot = food.get("prot_100", 0)
    carb = food.get("carb_100", 0)
    fat = food.get("fat_100", 0)
    nombre = (food.get("nombre", "") or "").lower()
    marca = (food.get("marca", "") or "").lower()

    if cal <= 0:
        return False

    # Macros no pueden sumar más kcal de las declaradas (margen 2.5×)
    cals_from_macros = prot * 4 + carb * 4 + fat * 9
    if cals_from_macros > 0 and cal > cals_from_macros * 2.5:
        return False

    # Proteína alta + calorías muy altas = error típico de OFF
    if cal > 400 and prot > 10:
        return False

    # Total macros no puede exceder 100g/100g
    if prot + carb + fat > 130:
        return False

    # Calorías ridículamente bajas para lo que no es agua/bebida sin calorías.
    # Causa típica: OFF usa datos "por porción preparada" donde 1g de sobre = 100g de líquido.
    _SIEMPRE_BAJO_CAL = ("agua", "water", "soda", "gaseosa", "refresco", "té ", "te ", "infusion", "café negro", "yerba")
    if cal < 15 and (prot + carb + fat) < 2:
        if not any(w in nombre for w in _SIEMPRE_BAJO_CAL):
            return False

    # Marcas de condimentos/sobres con kcal imposiblemente bajas
    # (el sobre de Knorr reporta macros del CALDO preparado, no del polvo)
    _MARCAS_SOBRE = ("knorr", "maggi", "fondor", "royco", "mcormick", "mc cormick", "mccormick", "magi")
    if cal < 40 and any(b in marca for b in _MARCAS_SOBRE):
        return False

    # Dato con proteína y grasa en cero pero calorías altas = probablemente incompleto
    if cal > 80 and prot == 0 and fat == 0 and carb == 0:
        return False

    return True


async def buscar_open_food_facts(query: str, limit: int = 8) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query, "search_simple": 1,
                    "action": "process", "json": 1,
                    "page_size": limit,
                    "fields": "product_name,brands,nutriments,code",
                }
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            results = []
            for p in data.get("products", []):
                parsed = _parse_off_product(p)
                if parsed and _es_dato_valido(parsed):
                    results.append(parsed)
            return results
    except Exception as e:
        print(f"[OFF Search Error] {e}")
        return []


async def _estimar_con_groq(query: str) -> dict | None:
    """Llama a Groq (Llama 3.1 8B) para estimar macros. Gratuito, sin restricción de país."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        return None
    prompt = (
        f"Sos nutricionista argentino. Para el alimento o plato: '{query}', "
        "estimá los macros promedio POR 100g de la preparación final (no por ingrediente individual). "
        "Considerá una receta casera estándar. "
        "Responde SOLO JSON sin texto extra: "
        '{\"alimento\": \"nombre corto\", \"calorias\": 0, \"proteinas\": 0, \"carbos\": 0, \"grasas\": 0}'
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 150,
                }
            )
        if resp.status_code != 200:
            print(f"[GROQ] Error HTTP {resp.status_code}")
            return None
        text = resp.json()["choices"][0]["message"]["content"]
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(0))
        return {
            "nombre": data.get("alimento", query),
            "nombre_en": query,
            "marca": "",
            "cal_100": round(float(data.get("calorias", 0)), 1),
            "prot_100": round(float(data.get("proteinas", 0)), 1),
            "carb_100": round(float(data.get("carbos", 0)), 1),
            "fat_100": round(float(data.get("grasas", 0)), 1),
            "fibra_100": 0,
            "source": "groq",
        }
    except Exception as e:
        print(f"[GROQ] Error: {e}")
        return None


def buscar_con_gemini(query: str) -> dict | None:
    result = estimar_nutricion_ollama(
        f"{query} (estima los macros POR 100 GRAMOS, no por porcion)"
    )
    if not result:
        return None
    return {
        "nombre": result.get("alimento", query),
        "nombre_en": query,
        "marca": "",
        "cal_100": round(float(result.get("calorias", 0)), 1),
        "prot_100": round(float(result.get("proteinas", 0)), 1),
        "carb_100": round(float(result.get("carbos", 0)), 1),
        "fat_100": round(float(result.get("grasas", 0)), 1),
        "fibra_100": 0,
        "source": "gemini",
        "barcode": "",
    }


_PLATO_KEYWORDS = [
    ' con ', ' a la ', ' al ', ' relleno', ' saltead', ' estofad',
    'guiso', 'milanesa', 'empanada', 'revuelto', 'sopa de ', 'cazuela',
    'tarta de', 'tortilla de', 'pizza', 'fideos con', 'arroz con',
    'pollo al', 'carne al', 'pescado al',
]

def _es_plato_compuesto(query: str) -> bool:
    """Platos multi-ingrediente: van directo a IA, no tienen sentido buscar en USDA."""
    q = query.lower()
    palabra_count = len(q.split())
    return palabra_count >= 3 and any(kw in q for kw in _PLATO_KEYWORDS)


_NATURAL_UNITS = ['tostada', 'tostadas', 'vaso', 'vasos', 'taza', 'tazas', 'copa', 'copas',
                  'porción', 'porciones', 'pedazo', 'pedazos', 'rebanada', 'rebanadas',
                  'unidad', 'unidades', 'rodaja', 'rodajas']

def _tiene_items_naturales(query: str) -> bool:
    """Detecta si el query combina al menos dos ítems con unidades naturales o conteos."""
    q = query.lower()
    has_connector = ' con ' in q or ' y ' in q or ' más ' in q or ' mas ' in q
    if not has_connector:
        return False
    has_natural = any(u in q for u in _NATURAL_UNITS) or bool(re.search(r'\b\d+\s+(?:taza|vaso|tostada|unidad|porci)', q))
    return has_natural


async def _parsear_plato_natural(query: str) -> list | None:
    """Parsea un plato con múltiples componentes a ítems con porciones naturales via Groq."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        return None
    prompt = (
        f"El usuario quiere registrar: '{query}'. "
        "Dividí esto en ítems separados con porciones naturales (tazas, unidades, vasos, etc). "
        "Para cada ítem estimá los macros TOTALES de la porción (no por 100g). "
        "Respondé SOLO JSON array sin texto extra: "
        '[{"nombre":"...", "cantidad": 1, "unidad": "taza", "kcal": 0, "proteinas": 0, "carbos": 0, "grasas": 0}]'
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 400,
                }
            )
        if resp.status_code != 200:
            return None
        text = resp.json()["choices"][0]["message"]["content"]
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if not match:
            return None
        items = json.loads(match.group(0))
        if not isinstance(items, list) or len(items) == 0:
            return None
        return items
    except Exception as e:
        print(f"[GROQ natural] Error: {e}")
        return None


async def busqueda_hibrida(perfil: str, query: str) -> dict:
    """
    Pipeline inteligente:
    0. Plato compuesto (con/al/guiso) → Groq IA directo
    1. SQLite cache (exacto)          → instantáneo
    2. SQLite semántico (fastembed)   → entiende variaciones
    3. Open Food Facts API            → productos envasados
    4. Groq IA fallback               → cualquier alimento no encontrado
    """
    query = query.strip()
    if not query:
        return {"cache": [], "external": [], "source": "none"}

    # Normalizar sinónimos argentinos
    query_norm = _normalizar(query)

    # ── Paso 0a: Plato con unidades naturales → parseo directo ──
    if _tiene_items_naturales(query_norm):
        natural = await _parsear_plato_natural(query_norm)
        if natural:
            return {"cache": [], "external": [], "natural_items": natural, "source": "natural"}

    # ── Paso 0: Plato compuesto → Groq IA directo ──
    if _es_plato_compuesto(query_norm):
        groq_result = await _estimar_con_groq(query_norm)
        if groq_result:
            guardar_alimento_cache(
                perfil=perfil, nombre=groq_result["nombre"], marca="",
                cal_100=groq_result["cal_100"], prot_100=groq_result["prot_100"],
                carb_100=groq_result["carb_100"], fat_100=groq_result["fat_100"],
                source="groq", global_entry=True,
            )
            return {"cache": [], "external": [groq_result], "source": "groq"}

    # ── Paso 1: SQLite cache exacto ──
    cache_results = buscar_alimentos_cache(perfil, query_norm)

    # Sanity check: si el primer resultado de groq parece imposiblemente alto para
    # un plato casero (ej: arroz con pollo a 356 kcal/100g), re-estimamos con el
    # prompt mejorado y actualizamos el cache para que el usuario no vea datos malos.
    if cache_results:
        top = cache_results[0]
        es_plato = len(query_norm.split()) >= 2
        if (top.get("source", "").startswith("groq") and
                top.get("cal_100", 0) > 280 and es_plato):
            print(f"[NUTRITION] Cache sospechoso ({top['cal_100']} kcal/100g) para '{query_norm}' — re-estimando")
            nuevo = await _estimar_con_groq(query_norm)
            if nuevo and nuevo["cal_100"] < top["cal_100"] * 0.85:
                guardar_alimento_cache(
                    perfil=perfil, nombre=nuevo["nombre"], marca="",
                    cal_100=nuevo["cal_100"], prot_100=nuevo["prot_100"],
                    carb_100=nuevo["carb_100"], fat_100=nuevo["fat_100"],
                    source="groq", global_entry=True,
                )
                return {"cache": [], "external": [nuevo], "source": "groq",
                        "corrected": True, "previous_cal": top["cal_100"]}

    if len(cache_results) >= 3:
        return {"cache": cache_results, "external": [], "source": "cache"}

    # ── Paso 2: Búsqueda semántica con fastembed ──
    semantic_results = _buscar_semantico(query_norm, perfil)
    if semantic_results:
        # Guardar el mejor resultado en cache para la próxima vez
        best = semantic_results[0]
        existing = buscar_alimentos_cache(perfil, best["nombre"])
        if not existing:
            guardar_alimento_cache(
                perfil=perfil, nombre=best["nombre"], marca="",
                cal_100=best["cal_100"], prot_100=best["prot_100"],
                carb_100=best["carb_100"], fat_100=best["fat_100"],
                source="semantic", global_entry=True,
            )
        return {
            "cache": cache_results,
            "external": semantic_results,
            "source": "semantic"
        }

    # ── Paso 3: Open Food Facts ──
    off_results = await buscar_open_food_facts(query_norm)
    for item in off_results:
        existing = buscar_alimentos_cache(perfil, item["nombre"])
        if not any(e["nombre"].lower() == item["nombre"].lower() for e in existing):
            guardar_alimento_cache(
                perfil=perfil, nombre=item["nombre"], marca=item["marca"],
                cal_100=item["cal_100"], prot_100=item["prot_100"],
                carb_100=item["carb_100"], fat_100=item["fat_100"],
                fibra_100=item["fibra_100"], source="openfoodfacts",
                barcode=item.get("barcode", ""), global_entry=True,
            )
    if off_results:
        return {"cache": cache_results, "external": off_results, "source": "openfoodfacts"}

    # ── Paso 4: Groq IA (Llama 3.1 — gratuito, sin restricción de país) ──
    groq_result = await _estimar_con_groq(query_norm)
    if groq_result:
        guardar_alimento_cache(
            perfil=perfil, nombre=groq_result["nombre"], marca="",
            cal_100=groq_result["cal_100"], prot_100=groq_result["prot_100"],
            carb_100=groq_result["carb_100"], fat_100=groq_result["fat_100"],
            source="groq", global_entry=True,
        )
        return {"cache": cache_results, "external": [groq_result], "source": "groq"}

    # ── Paso 5: Gemini (fallback, puede no funcionar por restricción geográfica) ──
    gemini_result = buscar_con_gemini(query_norm)
    if gemini_result:
        guardar_alimento_cache(
            perfil=perfil, nombre=gemini_result["nombre"], marca="",
            cal_100=gemini_result["cal_100"], prot_100=gemini_result["prot_100"],
            carb_100=gemini_result["carb_100"], fat_100=gemini_result["fat_100"],
            source="gemini", global_entry=True,
        )
        return {"cache": cache_results, "external": [gemini_result], "source": "gemini"}

    return {"cache": cache_results, "external": [], "source": "none"}
