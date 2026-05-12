import os
import sys
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

# CONFIGURACIÓN DE MODELOS
# Qwen es nuestro desarrollador estrella
llm_dev = ChatOllama(model="qwen2.5-coder:7b", num_ctx=16000, temperature=0)
# Llama 3 es nuestro arquitecto/planificador
llm_arch = ChatOllama(model="llama3:latest", num_ctx=8000, temperature=0.2)

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def refactor_component(file_path, task_description):
    print(f"🚀 Iniciando refactorización de: {file_path}")
    source_code = read_file(file_path)
    
    prompt = f"""
    Eres un Senior React Developer experto en optimización de rendimiento.
    
    TAREA: {task_description}
    
    ARCHIVO ORIGINAL:
    ```jsx
    {source_code}
    ```
    
    INSTRUCCIONES:
    1. Analiza el código y aplica la tarea solicitada.
    2. Si el archivo es muy grande, sepáralo en componentes lógicos.
    3. Devuelve CUALQUIER componente nuevo que deba crearse y la versión actualizada del original.
    4. Usa un formato claro: indica el NOMBRE DEL ARCHIVO y luego el código.
    5. Mantén las importaciones y estilos coherentes.
    """
    
    messages = [
        SystemMessage(content="Eres un experto en React y optimización de performance."),
        HumanMessage(content=prompt)
    ]
    
    print("🤖 Qwen está analizando el código (esto puede tardar por el tamaño del archivo)...")
    response = llm_dev.invoke(messages)
    
    output_dir = "refactor_proposals"
    proposal_path = os.path.join(output_dir, f"proposal_{os.path.basename(file_path)}")
    write_file(proposal_path, response.content)
    
    print(f"✅ Propuesta guardada en: {proposal_path}")
    return response.content

if __name__ == "__main__":
    # Ejemplo: Atacar el problema de GymView.jsx
    target = "frontend/src/components/GymView.jsx"
    task = "Dividir GymView.jsx en componentes más pequeños (Tabs, Listas, Modales) para mejorar la carga inicial y reducir los re-renders."
    
    if os.path.exists(target):
        refactor_component(target, task)
    else:
        print(f"❌ No se encontró el archivo: {target}")
