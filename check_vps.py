import paramiko, sys

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("179.43.120.62", port=5414, username="root", password="Sanluis673!pregunta20", timeout=15)

script = """import sys, numpy as np
sys.path.insert(0, '/root/vortice/backend')
from fastembed import TextEmbedding
from core.database_sqlite import get_conn

model = TextEmbedding("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
queries = ["chicken breast", "pechuga de pollo", "aguacate", "avocado"]

conn = get_conn()
rows = conn.execute("SELECT id, nombre, nombre_en, cal_100, embedding FROM alimentos_cache WHERE embedding IS NOT NULL").fetchall()
conn.close()

for query in queries:
    q_emb = np.array(list(model.embed([query]))[0], dtype=np.float32)
    q_norm = np.linalg.norm(q_emb)
    sims = []
    for row in rows:
        db_emb = np.frombuffer(row["embedding"], dtype=np.float32)
        db_norm = np.linalg.norm(db_emb)
        if db_norm == 0:
            continue
        sim = float(np.dot(q_emb, db_emb) / (q_norm * db_norm))
        sims.append((sim, row["nombre"], row["nombre_en"], row["cal_100"]))
    sims.sort(reverse=True)
    print("=== " + query + " ===")
    for sim, nombre, nombre_en, cal in sims[:5]:
        print("  " + str(round(sim,3)) + " | " + str(nombre) + " | " + str(nombre_en))
"""

_, out, err = c.exec_command(
    f"cd /root/vortice/backend && /root/vortice/backend/venv/bin/python3 -c {repr(script)} 2>&1",
    timeout=60
)
print(out.read().decode("utf-8", "replace"))
c.close()
