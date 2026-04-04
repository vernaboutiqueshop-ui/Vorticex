import os
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from .config import DATA_DIR
import chromadb

CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")
# Usamos nomic-embed-text o llama3, nomic es mucho más rápido y preciso para RAG.
try:
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
except:
    embeddings = OllamaEmbeddings(model="llama3") # Fallback si falla nomic

def _get_vector_store(perfil):
    """Obtiene o crea el namespace vectorial (colección Chroma) para un perfil específico."""
    client_settings = chromadb.config.Settings(is_telemetry_enabled=False)
    return Chroma(
        collection_name=f"chats_{perfil.lower()}",
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH,
        client_settings=client_settings
    )

def guardar_chat_vectorial(perfil, role, content):
    """Guarda un mensaje en la memoria profunda de ChromaDB."""
    try:
        vectorstore = _get_vector_store(perfil)
        doc_text = f"[{role.upper()}]: {content}"
        vectorstore.add_texts(
            texts=[doc_text],
            metadatas=[{"role": role, "perfil": perfil}]
        )
    except Exception as e:
        print(f"⚠️ [CHROMA] Error al guardar vector: {e}")

def buscar_memoria_semantica(perfil, query, limit=4):
    """Busca en el historial de chats frases semánticamente similares a la consulta actual."""
    try:
        vectorstore = _get_vector_store(perfil)
        docs = vectorstore.similarity_search(query, k=limit)
        if not docs: return ""
        
        resultado = "Recuerdos semánticos relevantes recuperados de charlas pasadas:\n"
        resultado += "\n".join([d.page_content for d in docs])
        return resultado
    except Exception as e:
        print(f"⚠️ [CHROMA] Error al recuperar memoria: {e}")
        return ""
