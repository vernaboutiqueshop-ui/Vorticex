# intelligence.py - MODO LITE (Ultra-rápido para VPS)
import os

def semantic_search_exercises(query: str, limit: int = 6):
    """Búsqueda simple por palabras clave para no saturar la RAM."""
    from core.database_sqlite import obtener_catalogo_completo
    all_ej = obtener_catalogo_completo()
    query = query.lower()
    
    # Búsqueda ultra-simple
    results = []
    for e in all_ej:
        text = f"{e.get('name', '')} {e.get('nombre_es', '')} {e.get('target', '')}".lower()
        if query in text:
            results.append(e['id_ejercicio'])
            
    return {"ids": [results[:limit]]}

def init_collections(): pass
def index_exercises(exercises): pass
def learn_nutrition(q, d): pass
def recall_nutrition(q): return None
