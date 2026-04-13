# c:\Users\Gonzalo\entrenador-ia\backend\core\intelligence.py
import os
import re
from typing import List, Dict

# MAPA DE INTENCIONES (Instantáneo y sin consumo de RAM)
KEYWORD_MAP = {
    "pecho": ["pectorals", "chest"],
    "pectoral": ["pectorals", "chest"],
    "espalda": ["back", "lats", "traps", "rhomboids"],
    "hombro": ["delts", "shoulders"],
    "brazo": ["biceps", "triceps"],
    "bicep": ["biceps"],
    "tricep": ["triceps"],
    "pierna": ["quads", "hamstrings", "glutes", "calves"],
    "gluteo": ["glutes"],
    "cuadricep": ["quads"],
    "femor": ["hamstrings"],
    "abdo": ["abs", "core"],
    "cardio": ["cardiovascular system"],
    "nuca": ["neck"]
}

def detect_muscle_keys(query: str) -> List[str]:
    """Detecta grupos musculares técnicos a partir de lenguaje natural."""
    found = []
    q_norm = query.lower()
    for key, targets in KEYWORD_MAP.items():
        if key in q_norm:
            found.extend(targets)
    return list(set(found))

def semantic_search_exercises(query: str, limit: int = 6):
    """
    Buscador 'Híbrido' optimizado para Vórtice.
    1. Detecta palabras clave (Instantáneo).
    2. Si no hay claves, hace una búsqueda inteligente por texto en SQLite.
    """
    from core.database_sqlite import obtener_catalogo_completo
    
    targets = detect_muscle_keys(query)
    all_ej = obtener_catalogo_completo()
    
    if targets:
        print(f"[INTEL] Claves detectadas: {targets}. Filtrando catálogo...")
        # Filtrar los que coincidan con los targets técnicos
        filtrados = [e for e in all_ej if e.get('target', '').lower() in targets]
        # Si no hay suficientes, rellenar con búsqueda por texto
        ids = [e['id_ejercicio'] for e in filtrados[:limit]]
        return {"ids": [ids]}
    
    # Si no hay palabras clave, buscar por coincidencia de texto simple en nombre o body_part
    print(f"[INTEL] Sin claves claras. Usando búsqueda por texto para: {query}")
    query_parts = query.lower().split()
    results = []
    for e in all_ej:
        match_score = 0
        text_to_search = f"{e['nombre_es']} {e['body_part']} {e['target']}".lower()
        for part in query_parts:
            if len(part) > 2 and part in text_to_search:
                match_score += 1
        if match_score > 0:
            results.append((match_score, e['id_ejercicio']))
    
    # Ordenar por relevancia y devolver IDs
    results.sort(key=lambda x: x[0], reverse=True)
    ids = [r[1] for r in results[:limit]]
    return {"ids": [ids]}

# Mantenemos las firmas por compatibilidad pero vacías de IA pesada
def init_collections():
    print("[INTEL] Modo LITE activado. Sin procesos de IA pesada en RAM.")

def index_exercises(exercises: List[Dict]):
    print(f"[INTEL] Catálogo de {len(exercises)} listo para búsqueda por palabras clave.")

def learn_nutrition(query: str, nutrition_data: Dict):
    pass

def recall_nutrition(query: str, threshold: float = 0.85):
    return None
