import json
import os

def generate_static_catalog():
    raw_path = 'raw_catalog.json'
    out_path = '../frontend/src/assets/ejercicios.json'
    
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} no encontrado.")
        return

    with open(raw_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    catalog = []
    for x in data:
        catalog.append({
            'id_ejercicio': x['id'],
            'nombre_en': x['name'],
            'nombre_es': x['name'].capitalize(),
            'target': x['target'],
            'body_part': x['bodyPart'],
            'equipment': x.get('equipment', 'General'),
            # Usar la ruta de nuestro nuevo proxy seguro
            'gif_url': f"/api/exercises/gif/{x['id']}",
            'source': 'static_raw_v1'
        })

    # Asegurar que el directorio de salida existe
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    
    print(f"Éxito: Se generó el catálogo estático con {len(catalog)} ejercicios en {out_path}")

if __name__ == "__main__":
    generate_static_catalog()
