"""Agregar índices SQLite para mejorar rendimiento de búsquedas"""
import sqlite3
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "vortice_elite.db")

def add_indexes():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    indexes = [
        # Índices para ejercicios y búsquedas
        ("idx_exercises_group", "CREATE INDEX IF NOT EXISTS idx_exercises_group ON exercises(group_id)"),
        ("idx_exercises_zone", "CREATE INDEX IF NOT EXISTS idx_exercises_zone ON exercises(zone_id)"),
        ("idx_exercises_equipment", "CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment)"),
        ("idx_i18n_name", "CREATE INDEX IF NOT EXISTS idx_i18n_name ON exercise_i18n(name)"),
        ("idx_i18n_lang", "CREATE INDEX IF NOT EXISTS idx_i18n_lang ON exercise_i18n(lang, exercise_id)"),
        
        # Índices para usuarios y posts
        ("idx_users_name", "CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)"),
        ("idx_posts_user", "CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created_at DESC)"),
        ("idx_posts_date", "CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(created_at DESC)"),
        
        # Índices para rutinas
        ("idx_routines_user", "CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id)"),
        ("idx_routine_exercises", "CREATE INDEX IF NOT EXISTS idx_routine_exercises ON routine_exercises(routine_id)"),
    ]
    
    for name, sql in indexes:
        try:
            cur.execute(sql)
            print(f"✅ {name} creado")
        except Exception as e:
            print(f"⚠️ {name}: {e}")
    
    conn.commit()
    conn.close()
    print("\n🚀 Índices agregados correctamente")

if __name__ == "__main__":
    add_indexes()
