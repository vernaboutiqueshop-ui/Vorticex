import os
import json
from core.firebase import get_db
from dotenv import load_dotenv

load_dotenv("backend/.env")

def comparar():
    db = get_db()
    if not db:
        print("Error: No connection to Firestore.")
        return

    # Buscar un ejercicio que sepamos que se cargó (por ejemplo el 0007 o 0015)
    doc_id = "0015" 
    doc = db.collection("catalogo_ejercicios").document(doc_id).get()
    
    if not doc.exists:
        print(f"El ejercicio {doc_id} no se encontró en Firestore.")
        return

    firebase_data = doc.to_dict()
    
    # Datos originales (aproximados de lo que venia de la API)
    # En el script original guardamos instruccion_en, asi que podemos comparar directo
    
    print("\n=== COMPARATIVA DE DATOS: INSTRUCTOR PRO ===")
    print(f"\nID: {doc_id}")
    print("-" * 50)
    print(f"NOMBRE ORIGINAL: {firebase_data.get('nombre_en')}")
    print(f"NOMBRE ARGENTINO: {firebase_data.get('nombre_es')}")
    print("-" * 50)
    print("\nINSTRUCIONES ORIGINALES (EN):")
    for step in firebase_data.get('instrucciones_en', []):
        print(f" - {step}")
        
    print("\nINSTRUCCIONES VÓRTICE (ES-AR):")
    for step in firebase_data.get('instrucciones_es', []):
        print(f" - {step}")
        
    print("-" * 50)
    print("\n[NUEVO] TIPS DEL INSTRUCTOR (Técnica Pro):")
    for tip in firebase_data.get('tips_es', []):
        print(f" * {tip}")
        
    print(f"\n[NUEVO] RESUMEN MOTIVADOR:\n{firebase_data.get('resumen_es')}")
    print("-" * 50)

if __name__ == "__main__":
    comparar()
