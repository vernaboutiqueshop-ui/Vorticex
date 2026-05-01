"""
nutrition_search.py - Hybrid nutrition search engine
Flow: SQLite cache → Open Food Facts API → Gemini AI fallback
All data normalized to 100g/100ml before storage.
"""
import json
import httpx
from core.database import buscar_alimentos_cache, guardar_alimento_cache
from core.ai import estimar_nutricion_ollama


def normalizar_a_100g(cal, prot, carb, fat, fibra=0, porcion_g=100):
    """Normalize macros proportionally to 100g."""
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


def _parse_off_product(product: dict) -> dict | None:
    """Parse an Open Food Facts product into our normalized schema."""
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
    """Search Open Food Facts API (free, no key needed)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
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
    """Fallback: use Gemini to estimate macros per 100g."""
    result = estimar_nutricion_ollama(
        f"{query} (estima los macros POR 100 GRAMOS, no por porcion)"
    )
    if not result:
        return None
    return {
        "nombre": result.get("alimento", query),
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
    Hybrid search pipeline:
    1. SQLite cache (instant)
    2. Open Food Facts API (fast, free)
    3. Gemini AI fallback (slower)
    Results from step 2 are cached for future searches.
    """
    query = query.strip()
    if not query:
        return {"cache": [], "external": [], "source": "none"}

    # Step 1: Local cache
    cache_results = buscar_alimentos_cache(perfil, query)
    if len(cache_results) >= 3:
        return {"cache": cache_results, "external": [], "source": "cache"}

    # Step 2: Open Food Facts
    off_results = await buscar_open_food_facts(query)

    # Cache external results as global entries
    for item in off_results:
        existing = buscar_alimentos_cache(perfil, item["nombre"])
        if not any(e["nombre"].lower() == item["nombre"].lower() and e["source"] == "openfoodfacts" for e in existing):
            guardar_alimento_cache(
                perfil=perfil,
                nombre=item["nombre"],
                marca=item["marca"],
                cal_100=item["cal_100"],
                prot_100=item["prot_100"],
                carb_100=item["carb_100"],
                fat_100=item["fat_100"],
                fibra_100=item["fibra_100"],
                source="openfoodfacts",
                barcode=item.get("barcode", ""),
                global_entry=True,
            )

    if off_results:
        return {"cache": cache_results, "external": off_results, "source": "openfoodfacts"}

    # Step 3: Gemini fallback
    gemini_result = buscar_con_gemini(query)
    if gemini_result:
        guardar_alimento_cache(
            perfil=perfil,
            nombre=gemini_result["nombre"],
            marca="",
            cal_100=gemini_result["cal_100"],
            prot_100=gemini_result["prot_100"],
            carb_100=gemini_result["carb_100"],
            fat_100=gemini_result["fat_100"],
            source="gemini",
            global_entry=True,
        )
        return {"cache": cache_results, "external": [gemini_result], "source": "gemini"}

    return {"cache": cache_results, "external": [], "source": "none"}
