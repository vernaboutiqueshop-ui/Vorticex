# app/services/nutrition_service.py
import httpx
from app.core.config import settings
from app.db.session import get_db_connection
from deep_translator import GoogleTranslator

# Servicio de traducción gratuito (Español -> Inglés)
translator = GoogleTranslator(source='es', target='en')

async def search_nutrition(query: str):
    """
    Busca información nutricional GRATUITA y en ESPAÑOL:
    1. Traduce la consulta para buscar en la USDA Local (Inglés).
    2. Busca en Open Food Facts (Soporte nativo para Español).
    """
    print(f"[*] Buscando nutrición para: '{query}'")
    
    # Intentar traducción para consulta local
    try:
        query_en = translator.translate(query)
        print(f"[*] Traducido para USDA: '{query_en}'")
    except Exception:
        query_en = query # Fallback si falla el traductor

    results = {"query_original": query, "items": [], "source": ""}

    # 1. Búsqueda en USDA Local (Datos traducidos)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT f.description, n.name as nutrient, fn.amount 
            FROM usda_foods f
            JOIN usda_food_nutrients fn ON f.fdc_id = fn.fdc_id
            JOIN usda_nutrients n ON fn.nutrient_id = n.id
            WHERE f.description LIKE ?
            LIMIT 15
        """, (f"%{query_en}%",))
        usda_results = cursor.fetchall()
        
        if usda_results:
            results["items"] = [dict(row) for row in usda_results]
            results["source"] = "USDA Local (Traducción Automática)"
            return results

    # 2. Fallback a Open Food Facts API (Gratis y Multilingüe)
    print(f"[*] Consultando Open Food Facts (Gratis)...")
    off_url = f"https://world.openfoodfacts.org/cgi/search.pl"
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "lc": "es", # Forzar resultados en español
        "page_size": 10
    }
    
    headers = {
        "User-Agent": "EliteFitnessApp/1.0 (arquitecto@ejemplomail.com)" # Requisito de OFF
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(off_url, params=params, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                products = data.get("products", [])
                
                # Transformamos la data de OFF para que use el mismo formato
                parsed_items = []
                for p in products:
                    name = p.get("product_name_es") or p.get("product_name") or "Desconocido"
                    nutriments = p.get("nutriments", {})
                    
                    # Extraer macros básicos
                    parsed_items.append({"description": name, "nutrient": "Calorías (kcal)", "amount": nutriments.get("energy-kcal_100g", 0)})
                    parsed_items.append({"description": name, "nutrient": "Proteína (g)", "amount": nutriments.get("proteins_100g", 0)})
                    parsed_items.append({"description": name, "nutrient": "Carbohidratos (g)", "amount": nutriments.get("carbohydrates_100g", 0)})
                    parsed_items.append({"description": name, "nutrient": "Grasas (g)", "amount": nutriments.get("fat_100g", 0)})
                
                results["items"] = parsed_items
                results["source"] = "Open Food Facts (Global / Español)"
                return results
        except Exception as e:
            print(f"[!] Error conectando con Open Food Facts: {e}")

    return {"message": "No se encontró información nutricional en español ni localmente."}
