# c:\Users\Gonzalo\entrenador-ia\backend\core\intelligence.py
import os
import json
from fastembed import TextEmbedding
import chromadb
from typing import List, Dict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")

# Inicializar motor de embeddings local (BAJO CONSUMO)
# La primera vez descargará el modelo (~100MB)
embed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

def get_chroma_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)

def init_collections():
    client = get_chroma_client()
    # Colección para Ejercicios
    client.get_or_create_collection(name="exercises_v2")
    # Colección para Conocimiento Nutricional
    client.get_or_create_collection(name="nutrition_knowledge")
    print("[INTEL] Colecciones de ChromaDB listas.")

def index_exercises(exercises: List[Dict]):
    """Indexa el catálogo de ejercicios en ChromaDB para búsqueda semántica."""
    client = get_chroma_client()
    col = client.get_collection(name="exercises_v2")
    
    ids = []
    documents = []
    metadatas = []
    
    for ex in exercises:
        ids.append(ex['id_ejercicio'])
        # El documento es lo que se usa para buscar el significado
        doc_text = f"Ejercicio: {ex['nombre_es']}. Zona: {ex['body_part']}. Objetivo: {ex['target']}."
        documents.append(doc_text)
        metadatas.append({
            "name": ex['nombre_es'],
            "target": ex['target'],
            "bp": ex['body_part']
        })
    
    # FastEmbed genera los vectores y Chroma los guarda
    col.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )
    print(f"[INTEL] {len(ids)} ejercicios indexados semánticamente.")

def semantic_search_exercises(query: str, limit: int = 5):
    client = get_chroma_client()
    col = client.get_collection(name="exercises_v2")
    results = col.query(
        query_texts=[query],
        n_results=limit
    )
    return results

def learn_nutrition(query: str, nutrition_data: Dict):
    """Guarda un nuevo aprendizaje nutricional en el mapa vectorial."""
    client = get_chroma_client()
    col = client.get_collection(name="nutrition_knowledge")
    
    col.add(
        ids=[query], # El texto original es el ID
        documents=[query],
        metadatas=[{
            "calories": nutrition_data.get("cal", 0),
            "proteins": nutrition_data.get("prot", 0),
            "carbs": nutrition_data.get("carb", 0),
            "fats": nutrition_data.get("gras", 0),
            "food_name": nutrition_data.get("alimento", "")
        }]
    )

def recall_nutrition(query: str, threshold: float = 0.85):
    """Busca si el sistema ya sabe algo sobre esta comida."""
    client = get_chroma_client()
    col = client.get_collection(name="nutrition_knowledge")
    
    results = col.query(
        query_texts=[query],
        n_results=1
    )
    
    if results['ids'] and results['ids'][0] and results['distances'] and results['distances'][0] and results['distances'][0][0] < (1 - threshold):
        return results['metadatas'][0][0]
    return None
