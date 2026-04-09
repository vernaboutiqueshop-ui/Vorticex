import os
import chromadb
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from .config import DATA_DIR

CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")

# Usamos el motor de Google para embeddings (MODO AHORRO: DESACTIVADO 🛑)
# try:
#     api_key = os.getenv("GEMINI_API_KEY", "...")
#     embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=api_key)
# except Exception as e:
#     embeddings = None

embeddings = None # Forzamos Mudo para ahorrar cuota

def _get_vector_store(perfil):
    """Obtiene o crea el namespace vectorial (colección Chroma) para un perfil específico."""
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return Chroma(
        collection_name=f"chats_{perfil.lower()}",
        embedding_function=embeddings,
        client=client
    )

def guardar_chat_vectorial(perfil, role, content):
    """(MODO AHORRO) Desactivado para no quemar cuota."""
    return 

def buscar_memoria_semantica(perfil, query, limit=4):
    """(MODO AHORRO) Desactivado para no quemar cuota."""
    return ""
