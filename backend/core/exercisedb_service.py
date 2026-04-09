import os
import requests
import time
from dotenv import load_dotenv

# Cargar variables de entorno desde la carpeta backend
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path)

X_RAPIDAPI_KEY = os.getenv("X_RAPIDAPI_KEY")
X_RAPIDAPI_HOST = os.getenv("X_RAPIDAPI_HOST", "exercisedb.p.rapidapi.com")

class ExerciseDBService:
    @staticmethod
    def get_all_exercises(limit=100, retries=3):
        """Obtiene ejercicios con reintentos para manejar el límite de velocidad (429)."""
        url = f"https://{X_RAPIDAPI_HOST}/exercises"
        headers = {
            "x-rapidapi-key": X_RAPIDAPI_KEY,
            "x-rapidapi-host": X_RAPIDAPI_HOST,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        params = {"limit": str(limit)}
        
        for i in range(retries):
            try:
                response = requests.get(url, headers=headers, params=params)
                if response.status_code == 429:
                    print(f"[ExerciseDB] Limite alcanzado (429). Esperando {2*(i+1)}s...")
                    time.sleep(2 * (i + 1))
                    continue
                
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"[ExerciseDB] Reintento {i+1} fallido: {e}")
                time.sleep(1)
        
        return []

    @staticmethod
    def get_body_parts():
        """Obtiene la lista de partes del cuerpo disponibles."""
        url = f"https://{X_RAPIDAPI_HOST}/exercises/bodyPartList"
        headers = {
            "X-RapidAPI-Key": X_RAPIDAPI_KEY,
            "X-RapidAPI-Host": X_RAPIDAPI_HOST
        }
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[ExerciseDB] Error al obtener partes del cuerpo: {e}")
            return []
