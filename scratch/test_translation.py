import requests
import json
import os
from google import generativeai as genai
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('backend/.env')

# Configurar Gemini
api_key_gemini = os.environ.get('GEMINI_API_KEY')
if not api_key_gemini:
    print("Error: GEMINI_API_KEY no encontrada.")
    exit()

genai.configure(api_key=api_key_gemini)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

# Configurar ExerciseDB
headers = {
    'X-RapidAPI-Key': 'af8115b881msh97cfabaa2879b93p1a90d8jsn004ca5fec071',
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    'Content-Type': 'application/json'
}

print("--- PASO 1: Fetching de ExerciseDB (/exercises) ---")
try:
    url = "https://exercisedb.p.rapidapi.com/exercises"
    res = requests.get(url, headers=headers, params={'limit':'1'})
    
    if res.status_code == 200:
        data = res.json()[0]
        print(f"Original (EN): {data['name']}")
        print(f"GIF URL: {data['gifUrl']}")
        
        print("\n--- PASO 2: Traduccion con Gemini (Modo Argento) ---")
        prompt = (
            f"Actúa como un personal trainer experto de Mendoza, Argentina. "
            f"Traducí este ejercicio a Español Argentino usando 'vos' y términos rioplatenses. "
            f"Respondé ÚNICAMENTE un JSON con: nombre_es, instrucciones_es (lista), target_es.\n\n"
            f"Datos del ejercicio:\n{json.dumps(data, indent=2)}"
        )
        
        response = model.generate_content(prompt)
        # Limpiar respuesta por si el modelo agrega ```json
        clean_res = response.text.replace("```json", "").replace("```", "").strip()
        print(clean_res)
    else:
        print(f"Error API: {res.status_code} - {res.text}")
except Exception as e:
    print(f"Excepción: {e}")
