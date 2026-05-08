"""
nutrition_search.py - Motor de búsqueda híbrido de alimentos
Pipeline: SQLite cache → Semántico (fastembed) → Open Food Facts → Gemini AI
"""
import json
import httpx
import numpy as np
from core.database import buscar_alimentos_cache, guardar_alimento_cache
from core.ai import estimar_nutricion_ollama

# ── Modelo fastembed (lazy loading — solo se carga cuando se necesita) ──
_embed_model = None
_embed_model_loading = False

def _get_embed_model():
    global _embed_model, _embed_model_loading
    if _embed_model is not None:
        return _embed_model
    if _embed_model_loading:
        return None
    try:
        _embed_model_loading = True
        from fastembed import TextEmbedding
        _embed_model = TextEmbedding("intfloat/multilingual-e5-small")
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

        # Generar embedding de la query
        q_emb = np.array(list(model.embed([query]))[0], dtype=np.float32)
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

        # Solo devolver si la similitud es suficientemente alta (>70%)
        resultados = []
        for sim, row in similitudes[:limit]:
            if sim < 0.70:
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
                if parsed and parsed["cal_100"] > 0:
                    results.append(parsed)
            return results
    except Exception as e:
        print(f"[OFF Search Error] {e}")
        return []


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


async def busqueda_hibrida(perfil: str, query: str) -> dict:
    """
    Pipeline híbrido:
    1. SQLite cache (exacto)      → instantáneo
    2. SQLite semántico (fastembed)→ 5-15ms, entiende sinónimos y variaciones
    3. Open Food Facts API        → productos envasados
    4. Gemini AI fallback         → estimación para platos no encontrados
    """
    query = query.strip()
    if not query:
        return {"cache": [], "external": [], "source": "none"}

    # Normalizar sinónimos argentinos
    query_norm = _normalizar(query)

    # ── Paso 1: SQLite cache exacto ──
    cache_results = buscar_alimentos_cache(perfil, query_norm)
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

    # ── Paso 4: Gemini ──
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
