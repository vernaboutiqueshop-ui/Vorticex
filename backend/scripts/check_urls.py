import sqlite3, os
db_path = "backend/data/vortice_elite.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT gif_url FROM exercises LIMIT 5")
rows = cur.fetchall()
for r in rows:
    print(r['gif_url'])
conn.close()
