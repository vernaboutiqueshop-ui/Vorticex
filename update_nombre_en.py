#!/usr/bin/env python3
"""
Puebla nombre_en para todos los alimentos USDA existentes.
Estrategia: match por valores nutricionales (cal/prot/carb/fat) - muy confiable.
No requiere traducción. Tarda ~2 minutos (39 páginas USDA).
"""
import sqlite3, urllib.request, json, time, sys

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


def build_nutrient_index(conn):
    """Index DB foods by (cal, prot, carb, fat) for fast lookup."""
    rows = conn.execute(
        "SELECT id, nombre, nombre_en, fdc_id, cal_100, prot_100, carb_100, fat_100 "
        "FROM alimentos_cache WHERE source='usda'"
    ).fetchall()
    by_nutrients = {}
    by_fdc = {}
    for r in rows:
        key = (r["cal_100"], r["prot_100"], r["carb_100"], r["fat_100"])
        # Store first match per nutrient combo
        if key not in by_nutrients:
            by_nutrients[key] = r
        if r["fdc_id"]:
            by_fdc[r["fdc_id"]] = r
    print(f"DB index: {len(rows)} USDA foods, {len(by_nutrients)} combos unicas, {len(by_fdc)} con fdc_id")
    return by_nutrients, by_fdc


def main():
    print("=" * 55)
    print("  Actualizador nombre_en USDA (via nutrientes)")
    print("=" * 55)

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    sin_en = conn.execute(
        "SELECT COUNT(*) FROM alimentos_cache WHERE source='usda' AND (nombre_en IS NULL OR nombre_en='')"
    ).fetchone()[0]
    print(f"Registros sin nombre_en: {sin_en}")

    if sin_en == 0:
        print("Todos ya tienen nombre_en!")
        conn.close()
        return

    by_nutrients, by_fdc = build_nutrient_index(conn)

    page = 1
    total_pages = None
    total_act = 0
    matched_fdc = 0
    matched_nutr = 0
    no_match = 0

    while True:
        try:
            data = usda_page(page)
        except Exception as e:
            print(f"  Error pag {page}: {e} — reintentando...")
            time.sleep(5)
            continue

        foods = data.get("foods", [])
        if not foods:
            break

        if total_pages is None:
            total_hits = data.get("totalHits", 0)
            total_pages = (total_hits + PAGE_SIZE - 1) // PAGE_SIZE
            print(f"Total paginas USDA: {total_pages}")

        updated_this_page = 0
        for f in foods:
            if f.get("foodCategory") not in CATEGORIAS_OK:
                continue

            fdc_id = f.get("fdcId")
            nombre_en = f["description"]
            nuts = {n.get("nutrientId"): float(n.get("value") or 0)
                    for n in f.get("foodNutrients", [])}
            kcal = round(nuts.get(N_KCAL, 0), 1)
            if kcal <= 0:
                continue

            prot = round(nuts.get(N_PROT, 0), 1)
            carb = round(nuts.get(N_CARB, 0), 1)
            fat = round(nuts.get(N_FAT, 0), 1)

            # 1) Match by fdc_id (most reliable if available)
            row = by_fdc.get(fdc_id)
            if row:
                matched_fdc += 1

            # 2) Match by nutrient combo
            if not row:
                key = (kcal, prot, carb, fat)
                row = by_nutrients.get(key)
                if row:
                    matched_nutr += 1
                else:
                    no_match += 1
                    continue

            row_id = row["id"]
            needs_en = not row["nombre_en"]
            needs_fdc = not row["fdc_id"]

            if needs_en or needs_fdc:
                conn.execute(
                    "UPDATE alimentos_cache SET nombre_en=CASE WHEN nombre_en='' OR nombre_en IS NULL THEN ? ELSE nombre_en END, "
                    "fdc_id=CASE WHEN fdc_id IS NULL THEN ? ELSE fdc_id END WHERE id=?",
                    (nombre_en, fdc_id, row_id)
                )
                total_act += 1
                updated_this_page += 1

        conn.commit()

        remaining = conn.execute(
            "SELECT COUNT(*) FROM alimentos_cache WHERE source='usda' AND (nombre_en IS NULL OR nombre_en='')"
        ).fetchone()[0]

        pct = round(page / total_pages * 100)
        print(f"  Pag {page}/{total_pages} ({pct}%) | +{updated_this_page} | total={total_act} fdc={matched_fdc} nutr={matched_nutr} no_match={no_match} | pendientes={remaining}")

        if remaining == 0:
            print("Todos actualizados!")
            break

        if len(foods) < PAGE_SIZE:
            break
        page += 1
        time.sleep(0.3)

    conn.close()
    print(f"\nListo! {total_act} actualizados.")
    if total_act > 0:
        print("Corre ahora: python3 -u /root/vortice/index_embeddings.py --reindex > /root/reindex2.log 2>&1 &")


if __name__ == "__main__":
    main()
