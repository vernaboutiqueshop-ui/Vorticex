# nutrition_search.py — Pipeline de búsqueda inteligente 4 capas
import httpx
import re

# Sinónimos y alias de cocina argentina
SINONIMOS = {
    "huevo duro": "huevo cocido", "huevos duros": "huevo cocido",
    "huevo hervido": "huevo cocido", "huevos hervidos": "huevo cocido",
    "huevo frito": "huevo frito", "huevos fritos": "huevo frito",
    "fideos": "fideos cocidos", "pasta": "fideos cocidos",
    "arroz": "arroz blanco cocido",
    "pollo": "pechuga de pollo", "pechuga": "pechuga de pollo",
    "bife": "bife de chorizo", "lomo": "lomo de vaca",
    "papa": "papa hervida", "papas": "papa hervida",
    "batata": "batata cocida",
    "leche": "leche entera",
    "yogur": "yogur entero", "yogurt": "yogur entero",
    "banana": "banana", "manzana": "manzana verde",
    "tomate": "tomate", "lechuga": "lechuga",
    "queso": "queso fresco",
    "atun": "atun al natural (lata)",
    "cafe": "mate cocido con leche",
    "naranja": "naranja",
    "zanahoria": "zanahoria",
}

def _limpiar_query(q: str) -> str:
    """Extrae el nombre del alimento limpiando cantidades, unidades y conectores."""
    q = q.lower().strip()
    # Remove quantities: "2 ", "200g de ", "300 gramos de "
    q = re.sub(r'^\d+[\.,]?\d*\s*(?:g|gr|gramos?|kg|ml|litros?|unidades?|u|de)?\s*', '', q)
    q = re.sub(r'\s+de\s+', ' ', q)
    # Remove cooking quantity words at start: "dos ", "tres ", "una "
    q = re.sub(r'^(?:dos?|tres|cuatro|cinco|una?|un)\s+', '', q)
    return q.strip()


def _stem_es(w: str) -> str:
    """Basic Spanish stemming: strip plural/gender endings."""
    if w.endswith("ces"): return w[:-3] + "z"
    if w.endswith("nes"): return w[:-2]  # canciones→cancion
    if len(w) > 4 and w.endswith("es"): return w[:-2]
    if len(w) > 4 and w.endswith("os"): return w[:-1]  # huevos→huevo
    if len(w) > 4 and w.endswith("as"): return w[:-1]
    return w

def _jaccard(a: str, b: str) -> float:
    """Stemmed word-level Jaccard similarity — ignores stop words."""
    STOPS = {"de","con","al","a","la","el","en","y","un","una","del","los","las"}
    wa = set(_stem_es(w) for w in a.lower().split() if w not in STOPS and len(w) >= 3)
    wb = set(_stem_es(w) for w in b.lower().split() if w not in STOPS and len(w) >= 3)
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def _mejor_match_cache(nombre: str, resultados: list, umbral: float = 0.2) -> list:
    """Re-rankea resultados por similitud con el query. Descarta los que no llegan al umbral."""
    scored = [(r, _jaccard(nombre, r["nombre"])) for r in resultados]
    scored = [(r, s) for r, s in scored if s >= umbral]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [r for r, _ in scored]


async def _normalizar_con_groq(query: str) -> str:
    """Groq normaliza el nombre: 'huevos duros' → 'huevo cocido'."""
    try:
        from core.ai import _groq_texto
        prompt = (
            f"Sos nutricionista argentino. El usuario busca: \"{query}\"\n"
            "Respondé SOLO con el nombre estándar del alimento en Argentina "
            "(singular, sin cantidades, sin preparación compleja).\n"
            "Ejemplos: 'huevos duros' → 'huevo cocido' | 'fideos con manteca' → 'fideos cocidos' "
            "| '2 bifes' → 'bife de chorizo' | 'café' → 'cafe con leche'\n"
            "Respuesta (solo el nombre, máximo 4 palabras):"
        )
        result = await _groq_texto(prompt, max_tokens=15)
        if result:
            return result.strip().lower().rstrip('.')
    except Exception:
        pass
    return query


async def busqueda_hibrida(perfil: str, query: str) -> dict:
    """Pipeline inteligente de búsqueda de alimentos:
    1. Cache exacto
    2. Sinónimos locales → cache
    3. Palabras clave → cache con Jaccard ≥ 0.2
    4. Groq normaliza → cache
    5. OpenFoodFacts (filtrado)
    6. Groq estima macros directamente
    """
    from core.database_sqlite import buscar_alimentos_cache

    q_clean = _limpiar_query(query)

    # ── CAPA 1: Cache exacto ────────────────────────────────────
    for q in [query, q_clean]:
        hits = buscar_alimentos_cache(perfil, q, limit=8)
        ranked = _mejor_match_cache(q_clean, hits, umbral=0.15)
        if ranked:
            return {"status": "success", "cache": ranked, "external": [], "source": "cache"}

    # ── CAPA 2: Sinónimos locales ───────────────────────────────
    normalizado_local = SINONIMOS.get(q_clean)
    if normalizado_local:
        hits = buscar_alimentos_cache(perfil, normalizado_local, limit=5)
        if hits:
            return {"status": "success", "cache": hits, "external": [], "source": "cache"}

    # ── CAPA 3: Palabras clave con Jaccard ─────────────────────
    STOPS_BUSQUEDA = {"gramos","cocido","cocida","asado","asada","plancha",
                      "hervido","hervida","con","del","las","los","una","uno",
                      "frito","frita","relleno","rellena","casero","casera"}
    palabras = [p for p in q_clean.split() if len(p) >= 4 and p not in STOPS_BUSQUEDA]
    for palabra in palabras[:3]:
        hits = buscar_alimentos_cache(perfil, palabra, limit=10)
        ranked = _mejor_match_cache(q_clean, hits, umbral=0.2)
        if ranked:
            return {"status": "success", "cache": ranked, "external": [], "source": "cache"}

    # ── CAPA 4: Groq normaliza → cache ──────────────────────────
    q_groq = await _normalizar_con_groq(q_clean)
    if q_groq and q_groq != q_clean:
        hits = buscar_alimentos_cache(perfil, q_groq, limit=8)
        ranked = _mejor_match_cache(q_groq, hits, umbral=0.15)
        if ranked:
            return {"status": "success", "cache": ranked, "external": [], "source": "cache"}
        # También probar palabras clave del resultado normalizado
        for p in q_groq.split():
            if len(p) >= 4:
                hits = buscar_alimentos_cache(perfil, p, limit=5)
                ranked = _mejor_match_cache(q_groq, hits, umbral=0.2)
                if ranked:
                    return {"status": "success", "cache": ranked, "external": [], "source": "cache"}

    # ── CAPA 5: OpenFoodFacts ───────────────────────────────────
    try:
        url = (f"https://world.openfoodfacts.org/cgi/search.pl"
               f"?search_terms={q_clean}&search_simple=1&action=process&json=1"
               f"&page_size=5&lc=es&cc=ar")
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
        if r.status_code == 200:
            products = r.json().get("products", [])
            res = []
            for p in products:
                nombre = p.get("product_name") or p.get("product_name_es") or ""
                cal = p.get("nutriments", {}).get("energy-kcal_100g", 0) or 0
                prot = p.get("nutriments", {}).get("proteins_100g", 0) or 0
                carb = p.get("nutriments", {}).get("carbohydrates_100g", 0) or 0
                fat = p.get("nutriments", {}).get("fat_100g", 0) or 0
                # Only accept if the name is at least somewhat relevant
                if nombre and cal > 0 and _jaccard(q_clean, nombre) > 0.1:
                    res.append({"nombre": nombre, "marca": p.get("brands",""),
                                "cal_100": round(cal,1), "prot_100": round(prot,1),
                                "carb_100": round(carb,1), "fat_100": round(fat,1),
                                "source": "off"})
            if res:
                return {"status": "success", "cache": [], "external": res, "source": "openfoodfacts"}
    except Exception:
        pass

    # ── CAPA 6: Groq estima macros ──────────────────────────────
    try:
        from core.ai import _groq_texto, clean_json
        import json as _j
        prompt = (f"Sos nutricionista argentino. Estimá macros por 100g de: \"{query}\"\n"
                  f"Respondé SOLO JSON: {{\"nombre\":\"{q_clean}\","
                  f"\"cal_100\":0,\"prot_100\":0,\"carb_100\":0,\"fat_100\":0}}")
        raw = await _groq_texto(prompt, max_tokens=80)
        if raw:
            data = _j.loads(clean_json(raw))
            if data.get("cal_100", 0) > 0:
                data["source"] = "groq"
                return {"status": "success", "cache": [], "external": [data], "source": "groq"}
    except Exception:
        pass

    return {"status": "success", "cache": [], "external": [], "source": "ninguna"}
