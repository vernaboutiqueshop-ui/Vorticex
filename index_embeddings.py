#!/usr/bin/env python3
"""
Genera embeddings para todos los alimentos en alimentos_cache usando fastembed.
Se corre UNA SOLA VEZ después de cargar los alimentos USDA.
Los embeddings se guardan en la DB — búsquedas semánticas instantáneas para siempre.
"""
import sqlite3, numpy as np, sys, time

DB = "/root/vortice/backend/data/vortice_elite.db"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BATCH_SIZE = 64

def main():
    print("=" * 55)
    print("  Indexador de Embeddings — fastembed")
    print(f"  Modelo: {MODEL_NAME}")
    print("=" * 55)

    # Importar fastembed
    try:
        from fastembed import TextEmbedding
    except ImportError:
        print("ERROR: fastembed no está instalado.")
        print("Corré: pip install fastembed")
        sys.exit(1)

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    # Agregar columna embedding si no existe
    try:
        conn.execute("ALTER TABLE alimentos_cache ADD COLUMN embedding BLOB")
        conn.commit()
        print("Columna 'embedding' agregada a alimentos_cache")
    except Exception:
        print("Columna 'embedding' ya existe")

    # Contar pendientes
    total = conn.execute(
        "SELECT COUNT(*) FROM alimentos_cache WHERE embedding IS NULL"
    ).fetchone()[0]
    ya_hechos = conn.execute(
        "SELECT COUNT(*) FROM alimentos_cache WHERE embedding IS NOT NULL"
    ).fetchone()[0]
    print(f"Pendientes: {total} | Ya indexados: {ya_hechos}")

    if total == 0:
        print("Todo ya está indexado!")
        conn.close()
        return

    # Cargar modelo (se descarga la primera vez ~90MB)
    print(f"\nCargando modelo {MODEL_NAME}...")
    t0 = time.time()
    model = TextEmbedding(MODEL_NAME)
    print(f"Modelo listo en {time.time()-t0:.1f}s")

    # Procesar en lotes para no saturar RAM
    rows = conn.execute(
        "SELECT id, nombre, nombre_en FROM alimentos_cache WHERE embedding IS NULL"
    ).fetchall()

    procesados = 0
    for i in range(0, len(rows), BATCH_SIZE):
        lote = rows[i:i + BATCH_SIZE]

        # Usar nombre_en si existe, sino nombre (español)
        # El modelo multilingüe entiende ambos igual
        textos = []
        ids = []
        for r in lote:
            texto = r["nombre_en"] if r["nombre_en"] else r["nombre"]
            textos.append(texto)
            ids.append(r["id"])

        # Generar embeddings del lote (5ms por embedding)
        embeddings = list(model.embed(textos))

        # Guardar en DB
        for id_, emb in zip(ids, embeddings):
            blob = np.array(emb, dtype=np.float32).tobytes()
            conn.execute(
                "UPDATE alimentos_cache SET embedding=? WHERE id=?",
                (blob, id_)
            )

        conn.commit()
        procesados += len(lote)
        pct = round(procesados / total * 100)
        print(f"  [{procesados}/{total}] {pct}% indexados")

    conn.close()
    print(f"\n✓ Listo! {procesados} alimentos indexados con embeddings.")
    print("  La búsqueda semántica está activa.")

if __name__ == "__main__":
    main()
