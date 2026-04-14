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
    "brazos": ["biceps", "triceps"],
    "bicep": ["biceps"],
    "tricep": ["triceps"],
    "pierna": ["quads", "hamstrings", "glutes", "calves"],
    "piernas": ["quads", "hamstrings", "glutes", "calves"],
    "gluteo": ["glutes"],
    "culo": ["glutes"],
    "cuadricep": ["quads"],
    "femor": ["hamstrings"],
    "abdo": ["abs", "core"],
    "panza": ["abs", "core"],
    "cardio": ["cardiovascular system"],
    "cinta": ["cardiovascular system"],
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

def score_exercise(e: Dict) -> int:
    score = 0
    equipment = e.get('equipment', '').lower()
    name = str(e.get('nombre_en', '')).lower() + ' ' + str(e.get('nombre_es', '')).lower()
    
    # Priority defaults
    if 'body weight' in equipment or 'dumbbell' in equipment or 'band' in equipment:
        score += 50
    elif 'barbell' in equipment or 'cable' in equipment:
        score += 20
        
    # Boost simple basics (push-up, squat, crunch, curl)
    basics = ['push-up', 'push up', 'squat', 'crunch', 'curl', 'plank', 'lunge']
    for b in basics:
        if b in name:
            score += 15
            break
            
    # Penalize strange assisted or specific niche machines
    if 'assisted' in name or 'machine' in name or 'sled' in equipment:
        score -= 20
        
    return score

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
        
        # ORDENAR POR SIMPLICIDAD / ACCESIBILIDAD 
        filtrados.sort(key=score_exercise, reverse=True)
        
        # Si no hay suficientes, rellenar con búsqueda por texto (se quitó ese comment porque no aplicaba al código original directamente)
        ids = [e['id_ejercicio'] for e in filtrados[:limit]]
        return {"ids": [ids]}
    
    # Si no hay palabras clave, buscar por coincidencia de texto simple en nombre o body_part
    print(f"[INTEL] Sin claves claras. Usando búsqueda por texto para: {query}")
    query_parts = query.lower().split()
    results = []
    for e in all_ej:
        match_score = 0
        text_to_search = f"{e.get('nombre_es', '')} {e.get('body_part', '')} {e.get('target', '')}".lower()
        for part in query_parts:
            if len(part) > 2 and part in text_to_search:
                match_score += 100
        if match_score > 0:
            match_score += score_exercise(e)
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
