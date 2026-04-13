# c:\Users\Gonzalo\entrenador-ia\backend\scripts\sync_vector_db.py
import os
import sys
import json

# Añadir el root del backend al path para que funcionen los imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database_sqlite import obtener_catalogo_completo
from core.intelligence import get_chroma_client, index_exercises

def sync_vector_db():
    print("--- [VORTICE] INICIANDO SINCRONIZACIÓN VECTORIAL ---")
    
    # 1. Obtener datos de SQLite
    print("[SQLITE] Extrayendo catálogo completo...")
    ejercicios = obtener_catalogo_completo()
    total = len(ejercicios)
    
    if total == 0:
        print("[ERROR] No hay ejercicios en SQLite. Abortando.")
        return

    print(f"[SQLITE] Se encontraron {total} ejercicios.")

    # 2. Preparar ChromaDB
    print("[CHROMA] Limpiando colección anterior...")
    client = get_chroma_client()
    try:
        # Intentamos borrar la colección para empezar de cero y que no haya basura
        client.delete_collection(name="exercises_v2")
        print("[CHROMA] Colección 'exercises_v2' eliminada.")
    except Exception as e:
        print(f"[CHROMA] Nota: La colección no existía o no se pudo borrar ({e})")

    # 3. Indexar (esto creará la colección de nuevo)
    print(f"[CHROMA] Indexando {total} ejercicios... (esto puede tardar unos minutos)")
    # La función index_exercises ya llama internamente a get_or_create_collection
    # Pero le pasamos los datos en el formato que espera
    index_exercises(ejercicios)
    
    print("--- [SUCCESS] SINCRONIZACIÓN COMPLETADA CON ÉXITO ---")
    print("[INFO] Ahora Vórtice tiene 'intuición' actualizada sobre todo tu catálogo.")

if __name__ == "__main__":
    sync_vector_db()
