import sqlite3
import os

DB_FILE = os.path.join("data", "entrenador.db")

def auditar():
    print("--- REPORTE DE SALUD DE VÓRTICE (entrenador.db) ---\n")
    if not os.path.exists(DB_FILE):
        print("BASE DE DATOS NO ENCONTRADA.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Scanner de Arquitectura
    tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    
    for t_row in tables:
        t = t_row[0]
        if t == 'sqlite_sequence': continue
        
        count = cursor.execute(f"SELECT count(*) FROM [{t}]").fetchone()[0]
        print(f"[{t.upper()}]: {count} registros")
        
        if count > 0:
            # Muestra real de las tripas
            cursor.execute(f"SELECT * FROM [{t}] LIMIT 3")
            for r in cursor.fetchall():
                print(f"  DATA: {str(r)[:100]}...")
        print("." * 40)
    
    conn.close()

if __name__ == "__main__":
    auditar()
