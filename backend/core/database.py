import sqlite3
import pandas as pd
import datetime
import os
from .config import DB_FILE, DATA_DIR

def inicializar_archivos():
    if not os.path.exists(DATA_DIR): 
        os.makedirs(DATA_DIR)
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Tabla de Eventos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            perfil TEXT,
            tipo TEXT,
            descripcion TEXT,
            humor TEXT,
            calorias_aprox REAL,
            proteinas REAL,
            carbohidratos REAL,
            grasas REAL,
            ejercicio_id TEXT,
            sets INTEGER,
            reps INTEGER,
            peso REAL,
            distancia_mts REAL,
            duracion_segs INTEGER
        )
    ''')
    
    # 2. Catálogo de Ejercicios (ExerciseDB)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalogo_ejercicios (
            id_ejercicio TEXT PRIMARY KEY,
            nombre_es TEXT,
            nombre_en TEXT,
            body_part TEXT,
            target TEXT,
            equipment TEXT,
            gif_url TEXT,
            instrucciones_es TEXT
        )
    ''')
    
    # 3. Tabla de Memoria Viva (Personalidad Dinámica)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS memoria_perfiles (
            perfil TEXT PRIMARY KEY,
            contexto_narrativo TEXT,
            historial_chat_resumido TEXT,
            fecha_actualizacion DATETIME
        )
    ''')

    # 4. Alacena Inteligente
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alacena (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            perfil TEXT,
            ingrediente TEXT,
            cantidad TEXT,
            calorias_aprox REAL DEFAULT 0,
            fecha_registro DATETIME
        )
    ''')
    
    # 5. Historial de Chat Persistente
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS historial_mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            perfil TEXT,
            rol TEXT,
            contenido TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6. Logs de Entrenamiento Detallados (Hevy Style)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS entrenamientos_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            perfil TEXT,
            timestamp DATETIME,
            ejercicio_id TEXT,
            target TEXT,
            set_nro INTEGER,
            peso REAL,
            reps INTEGER,
            rpe INTEGER,
            completado INTEGER DEFAULT 0
        )
    ''')
    
    # 7. Ayuno Intermitente
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ayuno_estado (
            perfil TEXT PRIMARY KEY,
            en_ayuno INTEGER DEFAULT 0,
            inicio_iso TEXT,
            meta_horas REAL
        )
    ''')
    
    # --- MIGRACIONES ---
    try:
        cursor.execute("ALTER TABLE entrenamientos_logs ADD COLUMN target TEXT")
    except: pass
    
    try:
        cursor.execute("ALTER TABLE alacena ADD COLUMN calorias_aprox REAL DEFAULT 0")
    except: pass

    cursor.execute("PRAGMA table_info(eventos)")
    columns = [col[1] for col in cursor.fetchall()]
    if "ejercicio_id" not in columns:
        cursor.execute("ALTER TABLE eventos ADD COLUMN ejercicio_id TEXT")
        cursor.execute("ALTER TABLE eventos ADD COLUMN sets INTEGER")
        cursor.execute("ALTER TABLE eventos ADD COLUMN reps INTEGER")
        cursor.execute("ALTER TABLE eventos ADD COLUMN peso REAL")
        cursor.execute("ALTER TABLE eventos ADD COLUMN distancia_mts REAL")
        cursor.execute("ALTER TABLE eventos ADD COLUMN duracion_segs INTEGER")
    
    conn.commit()
    conn.close()


# ============================================================
# EVENTOS
# ============================================================

def guardar_evento(perfil, tipo, desc, humor, cal, prot=0, carb=0, gras=0):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''INSERT INTO eventos (timestamp, perfil, tipo, descripcion, humor, calorias_aprox, proteinas, carbohidratos, grasas) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                  (now, perfil, tipo, desc, humor, cal, prot, carb, gras))
        conn.commit()
        conn.close()
    except Exception as e: 
        print(f"Error DB al guardar evento: {e}")

def consultar_datos(tabla, perfil, limit=10):
    try:
        conn = sqlite3.connect(DB_FILE)
        col_orden = "timestamp" if tabla == "eventos" else "fecha_registro"
        if tabla == "memoria_perfiles": col_orden = "fecha_actualizacion"
        if tabla == "historial_mensajes": col_orden = "id"
        
        query = f"SELECT * FROM {tabla} WHERE perfil=? ORDER BY {col_orden} DESC LIMIT ?"
        df = pd.read_sql_query(query, con=conn, params=(perfil, limit))
        conn.close()
        return df
    except Exception as e:
        print(f"Error al consultar datos de {tabla}: {e}")
        return pd.DataFrame()


# ============================================================
# CHAT
# ============================================================

def guardar_mensaje(perfil, rol, contenido):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO historial_mensajes (perfil, rol, contenido)
        VALUES (?, ?, ?)
    ''', (perfil, rol, contenido))
    conn.commit()
    conn.close()

def obtener_historial_chat(perfil, limite=20):
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query(
        f"SELECT rol, contenido FROM historial_mensajes WHERE perfil = ? ORDER BY id DESC LIMIT {limite}", 
        conn, params=(perfil,)
    )
    conn.close()
    return df.iloc[::-1].to_dict('records')


# ============================================================
# ALACENA
# ============================================================

def guardar_en_alacena(perfil, ingrediente, cantidad, calorias=0):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''INSERT INTO alacena (perfil, ingrediente, cantidad, calorias_aprox, fecha_registro) VALUES (?, ?, ?, ?, ?)''', 
                  (perfil, ingrediente, cantidad, calorias, now))
        conn.commit()
        conn.close()
    except Exception as e: 
        print(f"Error Alacena DB: {e}")

def eliminar_de_alacena(id_ingrediente):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('DELETE FROM alacena WHERE id=?', (id_ingrediente,))
        conn.commit()
        conn.close()
    except Exception as e: 
        print(f"Error al borrar de alacena: {e}")

def obtener_alacena(perfil):
    """Retorna todos los ingredientes de la alacena de un perfil."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, ingrediente, cantidad, calorias_aprox, fecha_registro FROM alacena WHERE perfil = ? ORDER BY fecha_registro DESC", (perfil,))
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "ingrediente": r[1], "cantidad": r[2], "calorias": r[3], "fecha": r[4]} for r in rows]
    except Exception as e:
        print(f"Error alacena: {e}")
        return []


# ============================================================
# MEMORIA VIVA
# ============================================================

def actualizar_memoria_perfil(perfil, contexto_narrativo, historial_chat_resumido):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''INSERT INTO memoria_perfiles (perfil, contexto_narrativo, historial_chat_resumido, fecha_actualizacion) 
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT(perfil) DO UPDATE SET 
                     contexto_narrativo=excluded.contexto_narrativo,
                     historial_chat_resumido=excluded.historial_chat_resumido,
                     fecha_actualizacion=excluded.fecha_actualizacion''',
                  (perfil, contexto_narrativo, historial_chat_resumido, now))
        conn.commit()
        conn.close()
    except Exception as e: 
        print(f"Error Memoria DB: {e}")

def obtener_memoria_perfil(perfil):
    df = consultar_datos("memoria_perfiles", perfil, limit=1)
    if not df.empty:
        return {
            "contexto_narrativo": df.iloc[0]["contexto_narrativo"],
            "historial_chat_resumido": df.iloc[0].get("historial_chat_resumido", "")
        }
    return None


# ============================================================
# GYM / ENTRENAMIENTOS
# ============================================================

def guardar_log_set(perfil, ej_id, set_nro, peso, reps, target=None, rpe=None):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.execute('''INSERT INTO entrenamientos_logs (perfil, timestamp, ejercicio_id, target, set_nro, peso, reps, rpe, completado)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)''', 
                  (perfil, now, ej_id, target, set_nro, peso, reps, rpe))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error guardando set log: {e}")

def obtener_entrenamientos_resumen(perfil, dias=30):
    """Retorna un resumen de entrenamientos agrupado por día para gráficos."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Volumen por día (kg * reps)
        cursor.execute("""
            SELECT DATE(timestamp) as fecha, 
                   SUM(peso * reps) as volumen_total,
                   COUNT(DISTINCT ejercicio_id) as ejercicios,
                   COUNT(*) as series_total
            FROM entrenamientos_logs 
            WHERE perfil = ? AND completado = 1 
                  AND timestamp >= DATE('now', ?)
            GROUP BY DATE(timestamp)
            ORDER BY fecha DESC
        """, (perfil, f'-{dias} days'))
        por_dia = [{"fecha": r[0], "volumen": r[1] or 0, "ejercicios": r[2], "series": r[3]} for r in cursor.fetchall()]
        
        # Distribución muscular
        cursor.execute("""
            SELECT target, COUNT(*) as sets_count
            FROM entrenamientos_logs 
            WHERE perfil = ? AND completado = 1 
                  AND timestamp >= DATE('now', ?)
                  AND target IS NOT NULL AND target != ''
            GROUP BY target
            ORDER BY sets_count DESC
        """, (perfil, f'-{dias} days'))
        por_musculo = [{"musculo": r[0], "sets": r[1]} for r in cursor.fetchall()]
        
        conn.close()
        return {"por_dia": por_dia, "por_musculo": por_musculo}
    except Exception as e:
        print(f"Error entrenamientos resumen: {e}")
        return {"por_dia": [], "por_musculo": []}

def obtener_eventos_timeline(perfil, limit=50):
    """Retorna eventos para la timeline de gráficos."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, tipo, descripcion, calorias_aprox, proteinas, carbohidratos, grasas
            FROM eventos 
            WHERE perfil = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (perfil, limit))
        rows = cursor.fetchall()
        conn.close()
        return [{
            "timestamp": r[0], "tipo": r[1], "descripcion": r[2],
            "calorias": r[3] or 0, "proteinas": r[4] or 0, 
            "carbos": r[5] or 0, "grasas": r[6] or 0
        } for r in rows]
    except Exception as e:
        print(f"Error timeline: {e}")
        return []

def obtener_macros_hoy(perfil):
    """Retorna la suma de macros registradas hoy para la brújula metabólica."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COALESCE(SUM(calorias_aprox), 0),
                   COALESCE(SUM(proteinas), 0),
                   COALESCE(SUM(carbohidratos), 0),
                   COALESCE(SUM(grasas), 0)
            FROM eventos 
            WHERE perfil = ? AND tipo = 'Nutricion'
                  AND DATE(timestamp) = DATE('now', 'localtime')
        """, (perfil,))
        r = cursor.fetchone()
        conn.close()
        return {
            "calorias": r[0], "proteinas": r[1], 
            "carbos": r[2], "grasas": r[3]
        }
    except Exception as e:
        print(f"Error macros hoy: {e}")
        return {"calorias": 0, "proteinas": 0, "carbos": 0, "grasas": 0}

# ============================================================
# AYUNO INTERMITENTE
# ============================================================

def actualizar_ayuno(perfil, en_ayuno, inicio_iso, meta_horas):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''INSERT INTO ayuno_estado (perfil, en_ayuno, inicio_iso, meta_horas)
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT(perfil) DO UPDATE SET
                     en_ayuno=excluded.en_ayuno,
                     inicio_iso=excluded.inicio_iso,
                     meta_horas=excluded.meta_horas''',
                  (perfil, int(en_ayuno), inicio_iso, meta_horas))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error Guardando Ayuno: {e}")

def obtener_ayuno(perfil):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT en_ayuno, inicio_iso, meta_horas FROM ayuno_estado WHERE perfil = ?", (perfil,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {"en_ayuno": bool(row[0]), "inicio": row[1], "meta_horas": row[2]}
    except: pass
    return {"en_ayuno": False, "inicio": None, "meta_horas": 16}