import os

# BASE_DIR = backend/, DATA_DIR = backend/data/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "entrenador.db")
PERFILES_FILE = os.path.join(DATA_DIR, "perfiles.json")
APP_NAME = "Vórtice Health"

# --- IA LOCAL (Ollama) ---
OLLAMA_URL = "http://localhost:11434/api/chat"
MODELO_IA = "gemma4"
MODELO_RAPIDO = "gemma4"  # Unificado para evitar la penalización de swapping en la VRAM
MODELO_VISION = "llava"     # Para análisis de imágenes

PERSONALIDAD_BASE = """
Eres Vórtice, un Coach de Salud inteligente y empático de Mendoza.
Tu estilo es profesional pero cercano, motivador y basado en datos.
Usa un tono alentador. Puedes saludar brevemente si es el inicio de la charla.
Analiza los datos biométricos y sugiere acciones claras para mejorar los hábitos del usuario.
"""
