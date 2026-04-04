import sqlite3
import json
from datetime import datetime
from core.config import DB_FILE
from core.ai import consultar_ollama

def generar_y_guardar_contexto(perfil):
    """
    Lee el historial reciente y la base de datos para generar un párrafo narrativo
    que represente el estado actual del usuario. Se guarda en memoria_perfiles.
    """
    print(f"🧠 Reconstruyendo memoria para: {perfil}...")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # 1. Traer datos recientes de la BD (últimos eventos)
        cursor.execute("SELECT tipo, descripcion, calorias_aprox FROM eventos WHERE perfil = ? ORDER BY timestamp DESC LIMIT 10", (perfil,))
        eventos = cursor.fetchall()
        
        cursor.execute("SELECT rol, contenido FROM historial_mensajes WHERE perfil = ? ORDER BY id DESC LIMIT 5", (perfil,))
        chats = cursor.fetchall()
    except Exception as e:
        print(f"⚠️ Error leyendo datos para memoria: {e}")
        eventos = []
        chats = []

    resumen_datos = "\n".join([f"- {e[0]}: {e[1]} ({e[2]} kcal)" for e in eventos]) if eventos else "Sin eventos recientes."
    resumen_chat = "\n".join([f"{c[0]}: {c[1]}" for c in chats]) if chats else "Sin chats recientes."

    # 2. Pedir a la IA que sintetice la 'Memoria Viva'
    prompt_sintesis = f"""
    Actúa como un sintetizador de memoria biométrica. 
    Datos recientes del usuario '{perfil}':
    {resumen_datos}
    
    Chat reciente:
    {resumen_chat}
    
    Genera UN SOLO párrafo corto (máximo 3 líneas) que resuma el estado actual de {perfil}, 
    sus logros recientes, su nivel de actividad y su estado de ánimo/objetivo. 
    Escribe en tercera persona de forma profesional.
    """
    
    # FIX: Usar la firma correcta de consultar_ollama (lista de mensajes)
    contexto_narrativo = consultar_ollama(
        [{"role": "user", "content": prompt_sintesis}],
        modelo="qwen2.5"
    )
    
    # 3. Guardar en SQLite
    try:
        cursor.execute('''
            INSERT OR REPLACE INTO memoria_perfiles (perfil, contexto_narrativo, historial_chat_resumido, fecha_actualizacion)
            VALUES (?, ?, ?, ?)
        ''', (perfil, contexto_narrativo, resumen_chat, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        
        conn.commit()
        print("✅ Memoria actualizada.")
    except Exception as e:
        print(f"❌ Error guardando memoria: {e}")
    finally:
        conn.close()

def obtener_contexto_vivo(perfil):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT contexto_narrativo FROM memoria_perfiles WHERE perfil = ?", (perfil,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else "Perfil nuevo sin historial registrado aún."
    except Exception as e:
        print(f"⚠️ Error leyendo memoria viva: {e}")
        return "Sin contexto disponible."
