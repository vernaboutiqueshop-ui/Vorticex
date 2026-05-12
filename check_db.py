import subprocess, sqlite3, os

data = subprocess.run(['git', '-C', r'c:\Users\Gonzalo\entrenador-ia', 'show', 'ce75cbc:backend/data/vortice_elite.db'], capture_output=True).stdout
tmp = r'c:\Users\Gonzalo\entrenador-ia\backend\data\vortice_elite_check.db'
open(tmp, 'wb').write(data)
conn = sqlite3.connect(tmp)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables:', [r[0] for r in cur.fetchall()])
cur.execute("SELECT COUNT(*) FROM exercises")
print('exercises:', cur.fetchone()[0])
try:
    cur.execute("SELECT COUNT(*) FROM exercise_i18n")
    print('exercise_i18n:', cur.fetchone()[0])
except Exception as e:
    print('no exercise_i18n:', e)
conn.close()
os.remove(tmp)
