import sqlite3
import os

# Configuración
DB_FILE = os.path.join("data", "vortice_cognitivo.db")

# Datos de muestra estructurados para Vórtice Health Intelligence (Traducción al Castellano)
EJERCICIOS = [
    # NATACIÓN
    ("sw_01", "Crol (Crawl)", "Freestyle Crawl", "cardio", "full body", "none", "https://v2.exercisedb.io/image/Yw0vO4H8YQ1T5a", "Nadar en posición ventral con movimientos alternos de brazos y patada constante."),
    ("sw_02", "Espalda", "Backstroke", "cardio", "back", "none", "https://v2.exercisedb.io/image/R9hD4S3zU4lO7j", "Nadar en posición dorsal con movimientos alternos de brazos."),
    ("sw_03", "Pecho (Braza)", "Breaststroke", "cardio", "chest", "none", "https://v2.exercisedb.io/image/0009", "Movimiento simétrico de brazos y patada de rana."),
    ("sw_04", "Mariposa", "Butterfly", "cardio", "shoulders", "none", "https://v2.exercisedb.io/image/0010", "Movimiento ondulatorio del cuerpo con recobro aéreo de ambos brazos."),
    
    # PECHO
    ("ch_01", "Press de Banca con Barra", "Barbell Bench Press", "chest", "pectorals", "barbell", "https://www.abc.es/media/bienestar/2019/08/02/press-banca-k8BD--1200x630@abc.jpg", "Tumbarse en el banco y bajar la barra al pecho antes de empujar."),
    ("ch_02", "Aperturas con Mancuernas", "Dumbbell Fly", "chest", "pectorals", "dumbbell", "https://v2.exercisedb.io/image/0011", "Bajar las mancuernas hacia los lados manteniendo una ligera flexión de codos."),
    
    # ESPALDA
    ("bk_01", "Dominadas", "Pull-ups", "back", "lats", "body weight", "https://v2.exercisedb.io/image/0012", "Colgarse de la barra y subir el mentón por encima de la misma."),
    ("bk_02", "Remo con Barra", "Barbell Row", "back", "upper back", "barbell", "https://v2.exercisedb.io/image/0013", "Inclinar el torso y llevar la barra hacia el ombligo."),
    
    # PIERNAS
    ("lg_01", "Sentadilla con Barra", "Barbell Squat", "legs", "quads", "barbell", "https://v2.exercisedb.io/image/0014", "Bajar la cadera manteniendo la espalda recta y subir."),
    ("lg_02", "Peso Muerto Rumano", "Romanian Deadlift", "legs", "hamstrings", "barbell", "https://v2.exercisedb.io/image/0015", "Bajar la barra pegada a las piernas sintiendo el estiramiento."),
    
    # BRAZOS
    ("arm_01", "Curl de Bíceps con Barra", "Barbell Curl", "arms", "biceps", "barbell", "https://v2.exercisedb.io/image/0016", "Flexionar los codos llevando la barra hacia los hombros."),
    ("arm_02", "Press Francés", "Skull Crusher", "arms", "triceps", "barbell", "https://v2.exercisedb.io/image/0017", "Bajar la barra hacia la frente y extender codos."),
]

def importar():
    print(f"Iniciando importacion de catalogo en {DB_FILE}...")
    
    if not os.path.exists(DB_FILE):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        # Forzamos la creación si no existe, aunque la app debería hacerlo
        conn = sqlite3.connect(DB_FILE)
        conn.close()

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Aseguramos que la tabla existe (redundante pero seguro)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalogo_ejercicios (
            id_ejercicio TEXT PRIMARY KEY,
            nombre_es TEXT,
            nombre_en TEXT,
            body_part TEXT,
            target TEXT,
            equipment TEXT,
            gif_url TEXT,
            instrucciones_es TEXT
        )
    ''')
    
    # Limpiamos catálogo previo para asegurar datos frescos
    cursor.execute("DELETE FROM catalogo_ejercicios")
    
    cursor.executemany('''
        INSERT INTO catalogo_ejercicios (id_ejercicio, nombre_es, nombre_en, body_part, target, equipment, gif_url, instrucciones_es)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', EJERCICIOS)
    
    conn.commit()
    count = cursor.execute("SELECT count(*) FROM catalogo_ejercicios").fetchone()[0]
    conn.close()
    
    print(f"Catalogo actualizado: {count} ejercicios cargados en Castellano.")

if __name__ == "__main__":
    importar()
