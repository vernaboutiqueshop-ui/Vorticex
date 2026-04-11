import sqlite3, os
db_path = "backend/data/vortice_elite.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
# Actualizar gif_url para que apunte al endpoint estático /gifs/ID.gif
cur.execute("UPDATE exercises SET gif_url = '/gifs/' || id || '.gif'")
print(f"[REPAIR] {cur.rowcount} ejercicios actualizados con rutas de GIFs locales.")
conn.commit()
conn.close()
