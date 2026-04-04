from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from .config import MODELO_IA

def chatear_con_langchain(perfil_actual, ultima_pregunta, contexto_sqlite, contexto_vectorial, ultimos_mensajes):
    """
    Usa el motor de Langchain para construir el prompt avanzado de RAG
    y responder a la consulta del usuario combinando memorias.
    """
    print("🧠 [LANGCHAIN] Armando cadena RAG profunda...")
    llm = OllamaLLM(model=MODELO_IA)
    
    # Formatear últimos mensajes de session state en un string (Contexto a cortísimo plazo)
    historial_reciente = "\n".join([f"[{m['role'].upper()}]: {m['content']}" for m in ultimos_mensajes[-5:]])
    
    # Plantilla experta de Langchain
    template = """
    {contexto_sqlite}
    
    ---
    [MEMORIA HISTÓRICA PROFUNDA (Recuerdos sobre este usuario extraídos semánticamente)]:
    {contexto_vectorial}
    ---
    
    [CHAT RECIENTE DE LA SESIÓN ACTUAL]:
    {historial_reciente}
    
    ---
    [NUEVO MENSAJE DE {perfil_actual}]:
    {ultima_pregunta}
    
    INSTRUCCIONES FINALES:
    Respondé respetando tu personalidad definida en el contexto. No rompas personaje. 
    Actuá como un entrenador humano real que recuerda todo lo anterior de forma natural. 
    Nunca digas "Según tu memoria profunda" o "Según los recuerdos semánticos". Usá la info con fluidez.
    """
    
    prompt = PromptTemplate(
        input_variables=["contexto_sqlite", "contexto_vectorial", "historial_reciente", "perfil_actual", "ultima_pregunta"],
        template=template
    )
    
    # LangChain v0.1 pipe operator
    chain = prompt | llm
    
    respuesta = chain.invoke({
        "contexto_sqlite": contexto_sqlite,
        "contexto_vectorial": contexto_vectorial if contexto_vectorial else "No hay recuerdos históricos relevantes.",
        "historial_reciente": historial_reciente,
        "perfil_actual": perfil_actual,
        "ultima_pregunta": ultima_pregunta
    })
    
    return respuesta
