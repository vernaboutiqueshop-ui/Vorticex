from langchain_core.prompts import PromptTemplate
from .config import MODELO_IA
from .ai import consultar_ollama

def chatear_con_langchain(perfil_actual, ultima_pregunta, contexto_sqlite, contexto_vectorial, ultimos_mensajes):
    """
    Usa la lógica unificada de Vórtice (Gemini Cloud + Fallback Local)
    para responder integrando las memorias recuperadas.
    """
    print("🧠 [LANGCHAIN] Armando cadena RAG profunda...")
    
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
    
    prompt_obj = PromptTemplate(
        input_variables=["contexto_sqlite", "contexto_vectorial", "historial_reciente", "perfil_actual", "ultima_pregunta"],
        template=template
    )
    
    # 5. Generar prompt final renderizado
    prompt_final = prompt_obj.format(
        contexto_sqlite=contexto_sqlite,
        contexto_vectorial=contexto_vectorial if contexto_vectorial else "No hay recuerdos históricos relevantes.",
        historial_reciente=historial_reciente,
        perfil_actual=perfil_actual,
        ultima_pregunta=ultima_pregunta
    )
    
    # 6. Consultar a la IA usando el motor resiliente (Gemini + Local fallback)
    respuesta = consultar_ollama([{"role": "user", "content": prompt_final}])
    
    return respuesta
