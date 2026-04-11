# app/db/session.py
import sqlite3
from app.core.config import settings

def get_db():
    """Context manager para obtener una conexión a la base de datos."""
    conn = sqlite3.connect(settings.DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def get_db_connection():
    """Retorna una conexión directa (no generador)."""
    conn = sqlite3.connect(settings.DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn
