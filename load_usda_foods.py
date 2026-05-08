#!/usr/bin/env python3
"""
Descarga alimentos del USDA SR Legacy, traduce al español y carga en DB.
Version 2: procesa de a 200 por vez - nunca satura la RAM.
"""
import sqlite3, urllib.request, urllib.parse, json, time

USDA_KEY = "yo8CK5psvhAZNHqGY0oH4vA1NixmCCT5gEdX8wAc"
BASE = "https://api.nal.usda.gov/fdc/v1"
DB = "/root/vortice/backend/data/vortice_elite.db"
PAGE_SIZE = 200

CATEGORIAS_OK = {
    "Beef Products", "Poultry Products", "Pork Products",
    "Lamb, Veal, and Game Products", "Finfish and Shellfish Products",
    "Dairy and Egg Products", "Vegetables and Vegetable Products",
    "Fruits and Fruit Juices", "Cereal Grains and Pasta",
    "Legumes and Legume Products", "Nut and Seed Products",
    "Fats and Oils", "Baked Products", "Sausages and Luncheon Meats",
    "Sweets", "Breakfast Cereals",
}

N_KCAL = 1008; N_PROT = 1003; N_FAT = 1004; N_CARB = 1005; N_FIBER = 1079


def usda_page(page):
    url = (f"{BASE}/foods/search?query=*&dataType=SR+Legacy"
           f"&pageSize={PAGE_SIZE}&pageNumber={page}&api_key={USDA_KEY}")
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "VorticeApp/1.0")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def translate_es(text):
    url = ("https://translate.googleapis.com/translate_a/single"
           "?client=gtx&sl=en&tl=es&dt=t&q=" + urllib.parse.quote(text[:500]))
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0")
    with urllib.request.urlopen(req, timeout=12) as r:
        d = json.loads(r.read().decode())
    return "".join(p[0] for p in d[0] if p[0])


def procesar_pagina(foods, conn):
    """Filtra, traduce e inserta un lote de alimentos."""
    insertados = 0
    for f in foods:
        if f.get("foodCategory") not in CATEGORIAS_OK:
            continue
        nuts = {n.get("nutrientId"): float(n.get("value") or 0)
                for n in f.get("foodNutrients", [])}
        kcal = nuts.get(N_KCAL, 0)
        if kcal <= 0:
            continue

        nombre_en = f["description"]
        try:
            nombre_es = translate_es(nombre_en)
            time.sleep(0.07)
        except:
            nombre_es = nombre_en

        existing = conn.execute(
            "SELECT id FROM alimentos_cache WHERE LOWER(nombre)=LOWER(?) AND source='usda'",
            (nombre_es,)
        ).fetchone()

        if not existing:
            conn.execute("""
                INSERT INTO alimentos_cache
                  (user_id, nombre, nombre_en, marca, cal_100, prot_100, carb_100, fat_100, fibra_100, source)
                VALUES (NULL, ?, ?, '', ?, ?, ?, ?, ?, 'usda')
            """, (nombre_es, nombre_en,
                  round(kcal, 1),
                  round(nuts.get(N_PROT, 0), 1),
                  round(nuts.get(N_CARB, 0), 1),
                  round(nuts.get(N_FAT, 0), 1),
                  round(nuts.get(N_FIBER, 0), 1)))
            insertados += 1

    conn.commit()
    return insertados


if __name__ == "__main__":
    print("=" * 55)
    print("  USDA Food Loader v2 (bajo consumo de RAM)")
    print("=" * 55)

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    # Contar cuántos USDA ya están en DB para permitir re-run
    ya_cargados = conn.execute(
        "SELECT COUNT(*) FROM alimentos_cache WHERE source='usda'"
    ).fetchone()[0]
    print(f"Ya en DB con source=usda: {ya_cargados}")

    page = 1
    total_insertados = 0
    total_foods = None

    while True:
        try:
            data = usda_page(page)
        except Exception as e:
            print(f"  Error página {page}: {e} — reintentando...")
            time.sleep(5)
            continue

        foods = data.get("foods", [])
        if not foods:
            break

        if total_foods is None:
            total_foods = data.get("totalHits", 0)
            total_pages = (total_foods + PAGE_SIZE - 1) // PAGE_SIZE
            print(f"Total USDA SR Legacy: {total_foods} ({total_pages} páginas)")

        insertados = procesar_pagina(foods, conn)
        total_insertados += insertados
        pct = round(page / total_pages * 100)
        print(f"  Página {page}/{total_pages} ({pct}%) — +{insertados} insertados | total: {total_insertados}")

        if len(foods) < PAGE_SIZE:
            break
        page += 1
        time.sleep(0.3)

    conn.close()
    print(f"\n✓ Listo! {total_insertados} alimentos nuevos cargados.")
