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
        memoria_viva TEXT DEFAULT 'Sin contexto generado aún.',
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

    # 8. FOLLOWERS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS followers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users(id),
        FOREIGN KEY (following_id) REFERENCES users(id),
        UNIQUE(follower_id, following_id)
    )
    """)

    # 9. FOLLOWS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
    )
    """)

    # 10. POSTS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT,
        image_url TEXT,
        media_type TEXT DEFAULT 'image',
        routine_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 11. POST LIKES
    cur.execute("""
    CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
    )
    """)

    # 12. POST COMMENTS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS post_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 13. GYM FOLDERS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS gym_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        perfil TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#06b6d4',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 14. NOTIFICATIONS
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        from_user TEXT NOT NULL,
        post_id INTEGER,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 10. FEEDBACK
    cur.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    try:
        cur.execute("ALTER TABLE users ADD COLUMN memoria_viva TEXT DEFAULT 'Sin contexto generado aún.'")
        conn.commit()
    except:
        pass

    try:
        cur.execute("ALTER TABLE feedback ADD COLUMN admin_reply TEXT DEFAULT NULL")
        conn.commit()
    except:
        pass

    try:
        cur.execute("ALTER TABLE feedback ADD COLUMN replied_at DATETIME DEFAULT NULL")
        conn.commit()
    except:
        pass

    # Asegurar columnas críticas en users
    for col in [
        "ALTER TABLE users ADD COLUMN exp INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1",
        "ALTER TABLE users ADD COLUMN profile_pic TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN last_penalty_date TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN height REAL DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN age INTEGER DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN gender TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN sports TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN password_plain TEXT DEFAULT NULL",
    ]:
        try:
            cur.execute(col)
            conn.commit()
        except:
            pass

    # Asegurar columnas críticas en routines
    for col in [
        "ALTER TABLE routines ADD COLUMN folder_id INTEGER DEFAULT NULL",
        "ALTER TABLE routines ADD COLUMN active INTEGER DEFAULT 1",
        "ALTER TABLE routines ADD COLUMN sets_data TEXT DEFAULT NULL",
    ]:
        try:
            cur.execute(col)
            conn.commit()
        except:
            pass

    # Asegurar columna color en gym_folders
    try:
        cur.execute("ALTER TABLE gym_folders ADD COLUMN color TEXT DEFAULT '#06b6d4'")
        conn.commit()
    except:
        pass

    print("[SUCCESS] Schema final consolidado.")
    conn.close()

if __name__ == "__main__":
    init_final_db()
