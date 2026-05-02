import sqlite3
import os

db_path = os.path.join('backend', 'data', 'vortice_elite.db')
conn = sqlite3.connect(db_path)
# Ponemos '1234' en texto plano (el backend de Vórtice suele ser flexible si no encuentra hash)
conn.execute("UPDATE users SET password = '1234' WHERE name = 'Gonza'")
conn.commit()
conn.close()
print("✅ Password de Gonza reseteada correctamente a 1234")
