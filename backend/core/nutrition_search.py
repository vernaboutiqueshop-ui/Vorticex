# nutrition_search.py - MODO LITE
import httpx

async def busqueda_hibrida(perfil: str, query: str) -> dict:
    """Búsqueda simple por texto + fallback a Open Food Facts."""
    from core.database_sqlite import buscar_alimentos_cache
    
    # 1. Cache local (SQLite)
    locales = buscar_alimentos_cache(perfil, query, limit=10)
    if locales:
        return {"status": "success", "cache": locales, "external": [], "source": "cache"}
        
    # 2. Fallback simple a Open Food Facts
    try:
        url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&search_simple=1&action=process&json=1&page_size=5"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                products = data.get("products", [])
                res = []
                for p in products:
                    res.append({
                        "nombre": p.get("product_name", "Desconocido"),
                        "marca": p.get("brands", ""),
                        "cal_100": p.get("nutriments", {}).get("energy-kcal_100g", 0),
                        "prot_100": p.get("nutriments", {}).get("proteins_100g", 0),
                        "carb_100": p.get("nutriments", {}).get("carbohydrates_100g", 0),
                        "fat_100": p.get("nutriments", {}).get("fat_100g", 0),
                        "source": "off"
                    })
                return {"status": "success", "cache": [], "external": res, "source": "openfoodfacts"}
    except:
        pass

    return {"status": "success", "cache": [], "external": [], "source": "ninguna"}
