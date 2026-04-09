import os
import json
import time
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

X_RAPIDAPI_KEY = os.getenv("X_RAPIDAPI_KEY")
X_RAPIDAPI_HOST = os.getenv("X_RAPIDAPI_HOST", "exercisedb.p.rapidapi.com")

def cosecha_hormiga(objetivo=100):
    print(f"--- INICIANDO RECOLECCIÓN HORMIGA (Objetivo: {objetivo}) ---")
    
    db_ejercicios = {} # Usamos dict para evitar duplicados por ID
    headers = {
        "x-rapidapi-key": X_RAPIDAPI_KEY,
        "x-rapidapi-host": X_RAPIDAPI_HOST,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # 1. Obtener Partes del Cuerpo
    print("   Obteniendo lista de partes del cuerpo...")
    try:
        res = requests.get(f"https://{X_RAPIDAPI_HOST}/exercises/bodyPartList", headers=headers)
        partes = res.json()
    except:
        partes = ["back", "cardio", "chest", "lower arms", "lower legs", "neck", "shoulders", "upper arms", "upper legs", "waist"]

    for parte in partes:
        if len(db_ejercicios) >= objetivo: break
        print(f"   -> Cosechando de: {parte}...")
        try:
            url = f"https://{X_RAPIDAPI_HOST}/exercises/bodyPart/{parte}"
            res = requests.get(url, headers=headers, params={"limit": "20"})
            data = res.json()
            for ej in data:
                db_ejercicios[ej["id"]] = ej
            time.sleep(1)
        except:
            continue

    # 2. Obtener por Músculo Objetivo (Target)
    if len(db_ejercicios) < objetivo:
        print("   Obteniendo lista de músculos objetivo...")
        musculos = ['abductors', 'abs', 'adductors', 'biceps', 'calves', 'cardiovascular system', 'delts', 'forearms', 'glutes', 'hamstrings', 'lats', 'levator scapulae', 'pectorals', 'quads', 'serratus anterior', 'spine', 'traps', 'triceps', 'upper back']
        for musculo in musculos:
            if len(db_ejercicios) >= objetivo: break
            print(f"   -> Cosechando de: {musculo}...")
            try:
                url = f"https://{X_RAPIDAPI_HOST}/exercises/target/{musculo}"
                res = requests.get(url, headers=headers, params={"limit": "30"})
                data = res.json()
                for ej in data:
                    db_ejercicios[ej["id"]] = ej
                time.sleep(1)
            except:
                continue

    # 3. Obtener por Equipamiento (si falta)
    if len(db_ejercicios) < objetivo:
        print("   Aún falta, probando por equipamiento...")
        equipos = ["barbell", "cable", "dumbbell", "leverage machine", "kettlebell", "band", "body weight", "stability ball"]
        for eq in equipos:
            if len(db_ejercicios) >= objetivo: break
            print(f"   -> Cosechando de: {eq}...")
            try:
                url = f"https://{X_RAPIDAPI_HOST}/exercises/equipment/{eq}"
                res = requests.get(url, headers=headers, params={"limit": "30"})
                data = res.json()
                for ej in data:
                    db_ejercicios[ej["id"]] = ej
                time.sleep(1)
            except:
                continue

    lista_final = list(db_ejercicios.values())
    
    if lista_final:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "raw_catalog.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(lista_final[:objetivo], f, indent=2, ensure_ascii=False)
        print(f"Success: Se recolectaron {len(lista_final)} ejercicios.")
        return True
    return False

if __name__ == "__main__":
    # Cosecha por categorías para esquivar el límite de 10 de la API
    cosecha_hormiga(500)
