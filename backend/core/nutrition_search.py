# nutrition_search.py - MODO LITE + AI PARSER
import httpx

async def busqueda_hibrida(perfil: str, query: str) -> dict:
    """Búsqueda inteligente: cache (exacto + fuzzy por palabras) → OpenFoodFacts."""
    from core.database_sqlite import buscar_alimentos_cache

    # 1. Cache exacto
    locales = buscar_alimentos_cache(perfil, query, limit=10)
    if locales:
        return {"status": "success", "cache": locales, "external": [], "source": "cache"}

    # 2. Fuzzy por palabras clave (toma palabras significativas del query)
    palabras = [p for p in query.lower().split() if len(p) >= 4
                and p not in {"gramos","cocido","cocida","asado","asada","plancha","hervido","hervida","con","del","las","los","una","uno"}]
    for palabra in palabras[:3]:
        parcial = buscar_alimentos_cache(perfil, palabra, limit=5)
        if parcial:
            # Rank by how many query words appear in the nombre
            query_words = set(query.lower().split())
            def relevance(item):
                nombre_words = set(item["nombre"].lower().split())
                return len(query_words & nombre_words)
            parcial.sort(key=relevance, reverse=True)
            return {"status": "success", "cache": parcial, "external": [], "source": "cache"}

    # 3. Fallback Open Food Facts
    try:
        url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1&page_size=5&lc=es&cc=ar"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                products = data.get("products", [])
                res = []
                for p in products:
                    nombre = p.get("product_name", "") or p.get("product_name_es", "") or "Desconocido"
                    cal = p.get("nutriments", {}).get("energy-kcal_100g", 0) or 0
                    prot = p.get("nutriments", {}).get("proteins_100g", 0) or 0
                    carb = p.get("nutriments", {}).get("carbohydrates_100g", 0) or 0
                    fat = p.get("nutriments", {}).get("fat_100g", 0) or 0
                    if nombre and cal > 0:  # skip empty/zero results
                        res.append({
                            "nombre": nombre,
                            "marca": p.get("brands", ""),
                            "cal_100": round(cal, 1),
                            "prot_100": round(prot, 1),
                            "carb_100": round(carb, 1),
                            "fat_100": round(fat, 1),
                            "source": "off"
                        })
                if res:
                    return {"status": "success", "cache": [], "external": res, "source": "openfoodfacts"}
    except Exception:
        pass

    # 4. Último recurso: Groq estima los macros directamente
    try:
        from core.ai import _groq_texto, clean_json
        prompt = f"""Sos nutricionista argentino. Estimá macros por 100g de: "{query}"
Respondé SOLO JSON (sin texto): {{"nombre":"{query}","cal_100":0,"prot_100":0,"carb_100":0,"fat_100":0}}"""
        raw = await _groq_texto(prompt, max_tokens=80)
        if raw:
            import json as _json
            data = _json.loads(clean_json(raw))
            if data.get("cal_100", 0) > 0:
                data["source"] = "groq"
                data["nombre"] = data.get("nombre", query)
                return {"status": "success", "cache": [], "external": [data], "source": "groq"}
    except Exception:
        pass

    return {"status": "success", "cache": [], "external": [], "source": "ninguna"}
