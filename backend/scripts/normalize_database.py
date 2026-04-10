import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore

# Configuración de rutas para importar el core de la app si es necesario
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Intentar inicializar Firebase usando el core de la app
try:
    from core.firebase import get_db
    db = get_db()
    if db:
        print("[NORMALIZER] Conexión a Firestore establecida vía core.firebase.")
    else:
        raise Exception("No se pudo obtener el cliente de Firestore.")
except Exception as e:
    print(f"[NORMALIZER] Error al conectar con Firebase: {e}")
    sys.exit(1)

# MAPEO DE NORMALIZACIÓN (Traductor Universal)
# Mapeamos términos en español o variantes a los estándares de ExerciseDB
NORM_MAP = {
    # Pecho
    'pecho': 'chest',
    'pectorales': 'chest',
    'pectorals': 'chest',
    
    # Espalda
    'espalda': 'back',
    'lats': 'back',
    'traps': 'back',
    'upper back': 'back',
    
    # Piernas
    'piernas': 'upper legs',
    'legs': 'upper legs',
    'quads': 'upper legs',
    'quadriceps': 'upper legs',
    'hamstrings': 'upper legs',
    'glutes': 'upper legs',
    'calves': 'lower legs',
    
    # Brazos
    'biceps': 'upper arms',
    'triceps': 'upper arms',
    'forearms': 'lower arms',
    
    # Core
    'abs': 'waist',
    'abdominals': 'waist',
    
    # Hombros
    'delts': 'shoulders'
}

def normalize():
    print("[NORMALIZER] Iniciando proceso de unificación de datos...")
    exercises_ref = db.collection("catalogo_ejercicios")
    docs = exercises_ref.stream()
    
    updated_count = 0
    total_count = 0
    
    for doc in docs:
        total_count += 1
        data = doc.to_dict()
        old_target = data.get('target', '').lower()
        old_body_part = data.get('body_part', '').lower()
        
        new_data = {}
        
        # Normalizar TARGET
        if old_target in NORM_MAP:
            new_data['target'] = NORM_MAP[old_target]
            
        # Normalizar BODY_PART
        if old_body_part in NORM_MAP:
            new_data['body_part'] = NORM_MAP[old_body_part]
            
        # Si hay cambios, actualizamos el documento
        if new_data:
            doc.reference.update(new_data)
            updated_count += 1
            print(f"  [FIXED] Ejercicio '{data.get('nombre_es', doc.id)}': {new_data}")
            
    print(f"\n[NORMALIZER] Proceso terminado.")
    print(f"  - Total revisados: {total_count}")
    print(f"  - Total normalizados: {updated_count}")

if __name__ == "__main__":
    normalize()
