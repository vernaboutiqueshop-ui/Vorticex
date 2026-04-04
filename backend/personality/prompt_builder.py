import os
from datetime import datetime
from personality.motor_memoria import obtener_contexto_vivo

# Importamos PERSONALIDAD_BASE desde config para evitar errores de referencia
from core.config import PERSONALIDAD_BASE

def build_system_prompt(perfil_actual, info_perfil, df_reciente):
    """
    Construye el prompt del sistema inyectando memoria narrativa y datos crudos de SQLite.
    """
    # 1. Obtener la Memoria Viva de SQLite (Resumen narrativo previo)
    memoria_viva = obtener_contexto_vivo(perfil_actual)
    
    # 2. Resumen de actividad reciente (Datos Crudos de la tabla eventos)
    if not df_reciente.empty:
        # Seleccionamos columnas clave para no saturar el contexto
        columnas = [c for c in ['tipo', 'descripcion', 'calorias_aprox', 'timestamp'] if c in df_reciente.columns]
        recientes = df_reciente.tail(15)[columnas].to_string(index=False)
    else:
        recientes = "Sin registros recientes en la base de datos."

    prompt = f"""
    FECHA_ACTUAL_SISTEMA: {datetime.now().strftime('%Y-%m-%d %H:%M')}
    ROL: {PERSONALIDAD_BASE}
    
    PERFIL DEL SUJETO:
    - Nombre: {perfil_actual}
    - Biometría/Metas: {info_perfil.get('descripcion', '')}
    - Rutina Base: {info_perfil.get('detalle', '')}
    - Instrucción Específica: {info_perfil.get('objetivo_ia', '')}
    
    MEMORIA VIVA (Contexto Narrativo de SQLite - Lo que sé de ti):
    {memoria_viva}
    
    HISTORIAL REAL (Datos Crudos de SQLite - Lo que has registrado):
    {recientes}
    
    INSTRUCCIONES CRÍTICAS:
    1. Si en el HISTORIAL ves un registro con calorias_aprox en 0 o None pero tiene descripción (ej: "2 empanadas"), DEBES ESTIMAR las calorías.
    2. Responde SIEMPRE en máximo 1 párrafo corto. Sé profesional, directo y ve al punto. Sin saludos ni relleno.
    3. Si el usuario menciona un avance (ej: "nadé 1.5km"), felicítalo en 1 línea y analiza el impacto calórico.
    4. Usa la MEMORIA VIVA para demostrar que le conoces.
    """
    return prompt