import sqlite3

conn = sqlite3.connect('backend/data/vortice_elite.db')

# Ver tablas
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("TABLAS:", [t[0] for t in tables])

# Ver columnas de users
cols = conn.execute("PRAGMA table_info(users)").fetchall()
print("COLUMNAS users:", [c[1] for c in cols])

# Listar usuarios
rows = conn.execute("SELECT * FROM users ORDER BY rowid").fetchall()
print(f"\n=== USUARIOS ({len(rows)}) ===")
col_names = [c[1] for c in cols]
for row in rows:
    for name, val in zip(col_names, row):
        if name != 'password_hash':
            print(f"  {name}: {val}")
    print("  ---")

conn.close()
