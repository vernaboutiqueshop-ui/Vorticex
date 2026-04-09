from core.firebase import get_db

# Lista de ejercicios maestros (Catalog base)
# URLs estáticas y cortas para evitar errores de sintaxis
EJERCICIOS_MAESTROS = [
    {
        "id_ejercicio": "sentadilla_squat",
        "nombre_es": "Sentadilla (Squat)",
        "body_part": "piernas",
        "target": "quadriceps",
        "gif_url": "https://media.giphy.com/media/l2JhORT5IFnj6ioko/giphy.gif",
        "instrucciones": "Bajar la cadera manteniendo la espalda recta, luego subir controladamente.",
        "equipment": "body weight"
    },
    {
        "id_ejercicio": "press_banca_bench_press",
        "nombre_es": "Press de Banca (Bench Press)",
        "body_part": "pecho",
        "target": "pectorales",
        "gif_url": "https://media.giphy.com/media/3o7TKVUn7iM8FMEU24/giphy.gif",
        "instrucciones": "Bajar la barra al pecho y empujar hacia arriba.",
        "equipment": "bench"
    },
    {
        "id_ejercicio": "dominadas_pull_ups",
        "nombre_es": "Dominadas (Pull Ups)",
        "body_part": "espalda",
        "target": "lats",
        "gif_url": "https://media.giphy.com/media/3o7TKMGpxr9J5vT7Y4/giphy.gif",
        "instrucciones": "Colgarse de la barra y subir el mentón por encima de la misma.",
        "equipment": "pull up bar"
    }
]

def seed():
    """Puebla la colección catalogo_ejercicios en Firestore."""
    db = get_db()
    if not db:
        print("[SEED] Error: No hay conexión a Firestore.")
        return
    
    col = db.collection("catalogo_ejercicios")
    print(f"[SEED] Iniciando carga de {len(EJERCICIOS_MAESTROS)} ejercicios...")
    
    for ej in EJERCICIOS_MAESTROS:
        try:
            col.document(ej['id_ejercicio']).set(ej)
            print(f"[SEED] OK: {ej['nombre_es']}")
        except Exception as e:
            print(f"[SEED] ERROR en {ej['id_ejercicio']}: {e}")
    
    print("[SEED] Proceso finalizado.")

if __name__ == "__main__":
    seed()
