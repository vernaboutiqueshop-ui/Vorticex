"""
seed_alimentos_ar.py
Seed the alimentos_cache table with 80+ common Argentine foods as global entries.
Run from backend/ directory: python seed_alimentos_ar.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "vortice_elite.db")

# Each entry: (nombre, cal_100, prot_100, carb_100, fat_100, fibra_100, nombre_en)
# Macros are per 100g, realistic Argentine portions
ALIMENTOS = [
    # ── PROTEINAS ────────────────────────────────────────────────────────────
    ("Milanesa de carne",              210, 22.0, 10.0, 10.0, 0.5, "Breaded beef schnitzel"),
    ("Milanesa de pollo",              195, 21.0,  9.5,  8.5, 0.4, "Breaded chicken schnitzel"),
    ("Pechuga de pollo a la plancha",  165, 31.0,  0.0,  3.6, 0.0, "Grilled chicken breast"),
    ("Muslo de pollo al horno",        189, 26.0,  0.0,  9.0, 0.0, "Baked chicken thigh"),
    ("Bife de chorizo",                250, 28.0,  0.0, 15.0, 0.0, "Sirloin steak"),
    ("Asado de tira",                  290, 26.0,  0.0, 20.0, 0.0, "Short rib / tira de asado"),
    ("Costillas de cerdo",             242, 27.0,  0.0, 14.5, 0.0, "Pork ribs"),
    ("Chorizo criollo",                350, 17.0,  1.5, 30.0, 0.0, "Argentine chorizo sausage"),
    ("Morcilla",                       320, 14.0,  3.0, 27.5, 0.0, "Blood sausage"),
    ("Empanada de carne",              230, 10.0, 22.0, 11.0, 1.0, "Beef empanada"),
    ("Empanada de jamon y queso",      245, 11.0, 21.0, 13.0, 0.8, "Ham and cheese empanada"),
    ("Hamburguesa casera",             263, 20.0,  6.0, 17.0, 0.3, "Homemade beef burger patty"),
    ("Filet de merluza",               118, 20.0,  0.0,  4.0, 0.0, "Hake fillet"),
    ("Atun al natural (lata)",         116, 26.0,  0.0,  1.0, 0.0, "Canned tuna in water"),
    ("Bife de paleta",                 220, 27.0,  0.0, 12.0, 0.0, "Shoulder blade steak"),
    ("Peceto a la cacerola",           195, 28.0,  2.0,  8.0, 0.0, "Braised eye of round"),

    # ── HIDRATOS / CARBOHIDRATOS ─────────────────────────────────────────────
    ("Arroz blanco cocido",            130,  2.5, 28.0,  0.3, 0.4, "Cooked white rice"),
    ("Arroz integral cocido",          112,  2.6, 23.0,  0.9, 1.8, "Cooked brown rice"),
    ("Fideos cocidos",                 158,  5.5, 31.0,  0.9, 1.8, "Cooked pasta"),
    ("Ñoquis de papa",                 130,  3.0, 25.0,  2.0, 0.8, "Potato gnocchi"),
    ("Tarta de verdura",               170,  5.5, 18.0,  8.0, 1.5, "Vegetable tart / quiche"),
    ("Pizza casera (muzzarella)",      266,  9.5, 33.0, 10.0, 1.2, "Homemade cheese pizza"),
    ("Medialunas de grasa",            390,  7.0, 44.0, 20.0, 1.0, "Argentine butter croissants"),
    ("Facturas dulces (variadas)",     370,  6.5, 48.0, 17.0, 1.0, "Argentine sweet pastries"),
    ("Pan frances",                    265, 10.0, 52.0,  2.0, 2.5, "French-style white roll"),
    ("Pan lactal blanco",              265,  9.0, 50.0,  3.5, 2.0, "Sliced white sandwich bread"),
    ("Pan lactal integral",            235,  9.5, 43.0,  3.5, 5.0, "Whole wheat sandwich bread"),
    ("Tostadas (vainillas/agua)",      395,  9.0, 75.0,  5.5, 2.0, "Water crackers / dry toast"),
    ("Galletitas de agua",             415,  9.0, 68.0, 12.0, 2.0, "Plain water biscuits"),
    ("Papa hervida",                    77,  2.0, 17.0,  0.1, 1.8, "Boiled potato"),
    ("Batata cocida",                   90,  1.6, 21.0,  0.1, 2.5, "Cooked sweet potato"),
    ("Polenta cocida",                  71,  1.7, 15.0,  0.3, 0.7, "Cooked polenta / cornmeal"),
    ("Puré de papas casero",           100,  2.5, 17.5,  2.5, 1.5, "Homemade mashed potatoes"),

    # ── VERDURAS / ENSALADAS ─────────────────────────────────────────────────
    ("Ensalada mixta (lechuga-tomate)",  18,  1.2,  2.8,  0.3, 1.2, "Mixed green salad"),
    ("Tomate fresco",                    18,  0.9,  3.5,  0.2, 1.2, "Fresh tomato"),
    ("Lechuga",                          15,  1.4,  2.2,  0.2, 1.8, "Lettuce"),
    ("Zanahoria cruda",                  41,  0.9,  9.6,  0.2, 2.8, "Raw carrot"),
    ("Choclo cocido",                   108,  3.4, 23.5,  1.0, 2.4, "Cooked corn / maize"),
    ("Remolacha cocida",                 44,  1.7,  9.6,  0.2, 2.0, "Cooked beetroot"),
    ("Zapallo cocido",                   28,  1.0,  6.0,  0.1, 0.5, "Cooked pumpkin / squash"),
    ("Berenjena cocida",                 25,  1.2,  5.5,  0.2, 3.0, "Cooked eggplant"),
    ("Espinaca cocida",                  23,  2.9,  3.6,  0.3, 2.2, "Cooked spinach"),
    ("Brocoli cocido",                   35,  2.8,  6.6,  0.4, 3.3, "Cooked broccoli"),
    ("Acelga cocida",                    20,  1.9,  3.6,  0.2, 1.6, "Cooked Swiss chard"),
    ("Cebolla cruda",                    40,  1.1,  9.3,  0.1, 1.7, "Raw onion"),
    ("Zapallito verde",                  17,  1.1,  3.1,  0.2, 1.1, "Courgette / zucchini"),
    ("Pimiento morrón rojo",             31,  1.0,  7.2,  0.3, 2.1, "Red bell pepper"),

    # ── LACTEOS ──────────────────────────────────────────────────────────────
    ("Leche entera",                     61,  3.2,  4.7,  3.3, 0.0, "Whole milk"),
    ("Leche descremada",                 36,  3.5,  5.0,  0.1, 0.0, "Skimmed milk"),
    ("Yogur entero natural",             62,  3.5,  4.5,  3.5, 0.0, "Whole plain yogurt"),
    ("Yogur descremado natural",         40,  4.5,  5.5,  0.1, 0.0, "Low-fat plain yogurt"),
    ("Queso cremoso",                   265, 16.0,  2.5, 21.0, 0.0, "Creamy cheese / cream cheese"),
    ("Queso fresco",                    250, 18.0,  2.0, 19.0, 0.0, "Fresh white cheese"),
    ("Queso barra (tybo/gouda)",        330, 24.0,  1.5, 25.0, 0.0, "Sliced semi-hard cheese"),
    ("Queso port salut",                300, 22.0,  1.0, 24.0, 0.0, "Port Salut cheese"),
    ("Ricota",                          145, 11.0,  3.0, 10.0, 0.0, "Ricotta cheese"),
    ("Flan casero",                     130,  5.0, 18.0,  4.5, 0.0, "Homemade egg flan"),
    ("Dulce de leche",                  315,  7.0, 55.0,  7.0, 0.0, "Dulce de leche"),

    # ── FRUTAS ───────────────────────────────────────────────────────────────
    ("Banana",                           89,  1.1, 23.0,  0.3, 2.6, "Banana"),
    ("Manzana verde",                    52,  0.3, 13.8,  0.2, 2.4, "Green apple"),
    ("Manzana roja",                     52,  0.3, 13.8,  0.2, 2.4, "Red apple"),
    ("Naranja",                          47,  0.9, 11.8,  0.1, 2.4, "Orange"),
    ("Mandarina",                        53,  0.8, 13.3,  0.3, 1.8, "Mandarin"),
    ("Pera",                             57,  0.4, 15.2,  0.1, 3.1, "Pear"),
    ("Durazno",                          39,  0.9,  9.5,  0.3, 1.5, "Peach"),
    ("Kiwi",                             61,  1.1, 14.7,  0.5, 3.0, "Kiwi fruit"),
    ("Frutillas",                        32,  0.7,  7.7,  0.3, 2.0, "Strawberries"),
    ("Uva",                              69,  0.7, 18.1,  0.2, 0.9, "Grapes"),
    ("Sandia",                           30,  0.6,  7.6,  0.2, 0.4, "Watermelon"),

    # ── BEBIDAS / INFUSIONES / SNACKS ────────────────────────────────────────
    ("Mate cocido con leche entera",     40,  2.0,  4.5,  1.5, 0.0, "Mate cocido with whole milk"),
    ("Cafe con leche (mitad leche)",     42,  2.2,  3.8,  1.7, 0.0, "Coffee with milk"),
    ("Jugo de naranja natural",          45,  0.7, 10.4,  0.2, 0.2, "Fresh orange juice"),
    ("Jugo de manzana natural",          46,  0.1, 11.3,  0.1, 0.2, "Fresh apple juice"),
    ("Alfajor simple (maicena)",        425,  5.5, 63.0, 17.0, 1.0, "Simple Argentine alfajor"),
    ("Alfajor triple chocolate",        470,  6.0, 58.0, 23.0, 1.5, "Triple chocolate alfajor"),

    # ── LEGUMBRES / CEREALES ─────────────────────────────────────────────────
    ("Lentejas cocidas",                116,  9.0, 20.0,  0.4, 7.9, "Cooked lentils"),
    ("Garbanzos cocidos",               164,  8.9, 27.4,  2.6, 7.6, "Cooked chickpeas"),
    ("Porotos negros cocidos",          132,  8.9, 23.7,  0.5, 8.7, "Cooked black beans"),
    ("Porotos blancos cocidos",         127,  8.7, 22.8,  0.5, 6.3, "Cooked white beans"),
    ("Avena instantanea (seca)",        372, 13.0, 66.0,  7.0, 10.1,"Instant rolled oats (dry)"),
    ("Granola casera",                  420, 10.0, 55.0, 18.0,  5.0, "Homemade granola"),

    # ── PLATOS TIPICOS ARGENTINOS ────────────────────────────────────────────
    ("Locro argentino",                 185, 10.0, 22.0,  6.5, 4.0, "Argentine locro stew"),
    ("Guiso de lentejas",               120,  7.0, 18.0,  2.5, 4.5, "Lentil stew"),
    ("Puchero de verduras",              80,  4.5, 12.0,  1.5, 2.5, "Vegetable stew / puchero"),
    ("Sopa de fideos casera",            65,  3.5, 10.5,  1.0, 0.8, "Homemade noodle soup"),
    ("Revuelto gramajo",                215, 12.0,  8.0, 15.0, 0.8, "Revuelto gramajo (eggs+ham+potato)"),
    ("Matambre a la pizza",             245, 22.0,  6.0, 14.5, 0.4, "Matambre a la pizza"),
]


def seed():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    inserted = 0
    skipped = 0

    print(f"Conectando a {DB_PATH}")
    print(f"Total de alimentos a insertar: {len(ALIMENTOS)}")
    print("-" * 60)

    for nombre, cal, prot, carb, fat, fibra, nombre_en in ALIMENTOS:
        # Check if a global entry with the same name already exists
        cur.execute(
            "SELECT id FROM alimentos_cache WHERE nombre = ? AND user_id IS NULL",
            (nombre,),
        )
        if cur.fetchone() is not None:
            skipped += 1
            print(f"  [--] {nombre} (ya existe, ignorado)")
            continue

        cur.execute(
            """
            INSERT INTO alimentos_cache
                (user_id, nombre, marca, porcion_desc,
                 cal_100, prot_100, carb_100, fat_100, fibra_100,
                 source, barcode, nombre_en)
            VALUES
                (NULL, ?, '', '100g',
                 ?, ?, ?, ?, ?,
                 'seed_ar', '', ?)
            """,
            (nombre, cal, prot, carb, fat, fibra, nombre_en),
        )
        inserted += 1
        print(f"  [OK] {nombre}")

    conn.commit()
    conn.close()

    print("-" * 60)
    print(f"Insertados: {inserted}  |  Ignorados (duplicados): {skipped}  |  Total procesados: {len(ALIMENTOS)}")


if __name__ == "__main__":
    seed()
