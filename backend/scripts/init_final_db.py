import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vortice_elite.db")

def init_final_db():
    print(f"--- INITIALIZING FINAL SCHEMA IN: {DB_PATH} ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. USERS (con password)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT DEFAULT '123456',
        weight REAL,
        goal TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. EXERCISES (Catalog - ya existe pero aseguramos columnas)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        body_part TEXT,
        equipment TEXT,
        target TEXT,
        instructions TEXT,
        gif_url TEXT
    )
    """)

    # 3. ROUTINES (Cabeceras)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 4. ROUTINE EXERCISES (Link table)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        sets INTEGER DEFAULT 3,
        reps TEXT DEFAULT '12',
        order_index INTEGER,
        FOREIGN KEY (routine_id) REFERENCES routines(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )
    """)

    # 5. ACTIVITY LOGS (Unificado para Chat, Gym, Comida)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'Chat', 'GymSet', 'Nutricion', 'Evento'
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        val1 REAL, -- Peso (KG) o Calorías
        val2 REAL, -- Reps o Proteínas
        val3 REAL, -- Carbos
        val4 REAL, -- Grasas
        ref_id TEXT, -- ID del ejercicio si es GymSet
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 6. PANTRY (Alacena)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pantry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ingredient TEXT NOT NULL,
        amount TEXT,
        calories REAL DEFAULT 0,
        proteins REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fats REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 7. FASTING (Ayuno)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS fasting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        start_time DATETIME,
        hours_goal REAL DEFAULT 16,
        is_active INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    
    # Migrar password si falta la columna (en caso de que la tabla ya exista)
    try:
        cur.execute("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456'")
        conn.commit()
    except:
        pass

    print("[SUCCESS] Schema final consolidado.")
    conn.close()

if __name__ == "__main__":
    init_final_db()
