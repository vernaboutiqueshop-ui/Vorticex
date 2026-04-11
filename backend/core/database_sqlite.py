# c:\Users\Gonzalo\entrenador-ia\backend\core\database_sqlite.py
import sqlite3
import os
import datetime
import json

# Ruta relativa dinámica (busca data/vortice_elite.db en la misma carpeta que el servidor)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "vortice_elite.db")

def get_conn():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Base de datos no encontrada en: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def _today():
    return datetime.datetime.now().strftime("%Y-%m-%d")

# --- PERFILES ---
def obtener_perfil(nombre: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE name = ?", (nombre,))
        row = cur.fetchone()
        if row:
            res = dict(row)
            # Re-mapear para compatibilidad con el resto de la app
            res["descripcion"] = f"Meta: {res.get('goal')}. Peso: {res.get('weight')}kg."
            res["objetivo_ia"] = res.get('goal')
            return res
    return None

def guardar_perfil(nombre: str, data: dict):
    # Extraemos datos, priorizando los campos directos o los de data
    weight = data.get("peso", data.get("weight", 0))
    goal = data.get("objetivo_ia", data.get("goal", ""))
    email = data.get("email", f"{nombre}@vortice.local")
    password = data.get("password", "123456")
    
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (name, email, weight, goal, password)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                weight=excluded.weight,
                goal=excluded.goal,
                password=excluded.password
        """, (nombre, email, weight, goal, password))
        conn.commit()

def listar_perfiles():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM users")
        return {row['name']: {"id": row['name']} for row in cur.fetchall()}
# MAPEO DE NORMALIZACIÓN PARA FRONTEND
NORM_MAP = {
    'Cintura': 'Abs',
    'Brazos (Sup)': 'Brazos',
    'Pantorrillas': 'Piernas',
    'Cardio': 'Cardio',
    'Hombros': 'Hombros',
    'Antebrazos (Inf)': 'Brazos',
    'Piernas (Sup)': 'Piernas',
    'Cuello': 'Espalda',
    'Pecho': 'Pecho',
    'Espalda': 'Espalda',
    'back': 'Espalda'
}

# --- CATALOGO ---
def obtener_catalogo_completo():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM exercises")
        rows = cur.fetchall()
        print(f"[SQLITE] Catálogo consultado. Registros encontrados: {len(rows)}")
        
        catalogo = []
        for r in rows:
            mapped_body_part = NORM_MAP.get(r['body_part'], r['body_part'])
            if r['target'] == 'Biceps' or r['target'] == 'Triceps':
                mapped_body_part = 'Brazos'
            inst_str = r['instructions'] if r['instructions'] else '[]'
            try:
                inst_list = json.loads(inst_str)
            except:
                inst_list = [inst_str] if inst_str and inst_str != '[]' else []

            catalogo.append({
                "id_ejercicio": r['id'],
                "nombre_es": r['name'],
                "body_part": mapped_body_part,
                "target": r['target'],
                "equipment": r['equipment'],
                "instrucciones_es": inst_list,
                "gif_url": f"/gifs/{r['id']}.gif"
            })
        return catalogo

def buscar_ejercicio_por_id(id_ej: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM exercises WHERE id = ?", (id_ej,))
        row = cur.fetchone()
        if row:
            r = dict(row)
            r["id_ejercicio"] = r["id"]
            r["nombre_es"] = r["name"]
            r["gif_url"] = f"/gifs/{r['id']}.gif"
            return r
    return None

# --- CHAT / MENSAJES ---
def guardar_mensaje(perfil: str, rol: str, contenido: str):
    # En SQLite unificado, los mensajes van a activity_logs tipo 'Chat'
    with get_conn() as conn:
        cur = conn.cursor()
        # Primero obtenemos o creamos el usuario
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        user = cur.fetchone()
        user_id = user['id'] if user else 1 # Fallback al primer user
        
        cur.execute("""
            INSERT INTO activity_logs (user_id, type, description)
            VALUES (?, 'Chat', ?)
        """, (user_id, f"{rol}: {contenido}"))
        conn.commit()

def obtener_historial_chat(perfil: str, limite: int = 20):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT description FROM activity_logs 
            JOIN users ON users.id = activity_logs.user_id
            WHERE users.name = ? AND type = 'Chat'
            ORDER BY timestamp DESC LIMIT ?
        """, (perfil, limite))
        rows = cur.fetchall()
        # Desglosar 'rol: contenido'
        hist = []
        for r in reversed(rows):
            parts = r['description'].split(": ", 1)
            if len(parts) == 2:
                hist.append({"rol": parts[0], "contenido": parts[1]})
        return hist

# --- NUTRICION / EVENTOS ---
def guardar_evento(perfil: str, tipo: str, desc: str, humor: str, cal: float, prot: float=0, carb: float=0, gras: float=0):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        user = cur.fetchone()
        u_id = user['id'] if user else 1
        
        cur.execute("""
            INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, val4)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (u_id, tipo, desc, cal, prot, carb, gras))
        conn.commit()

def obtener_comidas_hoy(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        hoy = _today()
        cur.execute("""
            SELECT activity_logs.* FROM activity_logs 
            JOIN users ON users.id = activity_logs.user_id
            WHERE users.name = ? AND type = 'Nutricion' 
            AND date(timestamp) = ?
        """, (perfil, hoy))
        return [{
            "id": r['id'],
            "timestamp": r['timestamp'],
            "descripcion": r['description'],
            "calorias": r['val1'],
            "proteinas": r['val2'],
            "carbos": r['val3'],
            "grasas": r['val4']
        } for r in cur.fetchall()]

def obtener_macros_hoy(perfil: str):
    comidas = obtener_comidas_hoy(perfil)
    return {
        "calorias": sum(c["calorias"] for c in comidas),
        "proteinas": sum(c["proteinas"] for c in comidas),
        "carbos": sum(c["carbos"] for c in comidas),
        "grasas": sum(c["grasas"] for c in comidas),
    }

# --- RUTINAS ---
def guardar_rutina(perfil: str, nombre: str, descripcion: str, ejercicios: list):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u_id = cur.fetchone()['id']
        
        cur.execute("INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)", (u_id, nombre, descripcion))
        r_id = cur.lastrowid
        
        for i, ex in enumerate(ejercicios):
            cur.execute("""
                INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, order_index)
                VALUES (?, ?, ?, ?, ?)
            """, (r_id, ex.get('id_ejercicio', ex.get('id')), ex.get('series', 3), ex.get('reps', '12'), i))
        conn.commit()

def obtener_rutinas(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT routines.* FROM routines 
            JOIN users ON users.id = routines.user_id
            WHERE users.name = ?
        """, (perfil,))
        rutinas = []
        for r in cur.fetchall():
            cur.execute("SELECT * FROM routine_exercises WHERE routine_id = ?", (r['id'],))
            exs = [dict(e) for e in cur.fetchall()]
            rutinas.append({
                "id": r['id'],
                "nombre": r['name'],
                "descripcion": r['description'],
                "ejercicios": exs,
                "fecha": r['created_at']
            })
        return rutinas

# COMPATIBILIDAD
def consultar_datos(tabla: str, perfil: str): 
    # Mapeo genérico para evitar errores
    if tabla == "alacena": return obtener_alacena(perfil)
    if tabla == "entrenamientos": return obtener_entrenamientos_resumen(perfil, 30)
    return []

def borrar_historial_chat(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM activity_logs 
            WHERE user_id = (SELECT id FROM users WHERE name = ?) AND type = 'Chat'
        """, (perfil,))
        conn.commit()

def guardar_log_set(perfil: str, id_ejercicio: str, set_num: int, peso: float, reps: int, target: str=""):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u_id = cur.fetchone()['id']
        cur.execute("""
            INSERT INTO activity_logs (user_id, type, description, val1, val2, ref_id)
            VALUES (?, 'GymSet', ?, ?, ?, ?)
        """, (u_id, f"Set {set_num} de {id_ejercicio}", peso, reps, id_ejercicio))
        conn.commit()

def obtener_alacena(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, ingredient as ingrediente, amount as cantidad, calories as calorias 
            FROM pantry 
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
        """, (perfil,))
        return [dict(r) for r in cur.fetchall()]

def guardar_en_alacena(perfil: str, ingrediente: str, cantidad: str, calorias: float=0):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u_id = cur.fetchone()['id']
        cur.execute("""
            INSERT INTO pantry (user_id, ingredient, amount, calories)
            VALUES (?, ?, ?, ?)
        """, (u_id, ingrediente, cantidad, calorias))
        conn.commit()

def eliminar_de_alacena_perfil(perfil: str, item_id: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM pantry WHERE id = ?", (item_id,))
        conn.commit()

def obtener_entrenamientos_resumen(perfil: str, dias: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT date(timestamp) as fecha, count(*) as series, sum(val1 * val2) as volumen
            FROM activity_logs 
            WHERE user_id = (SELECT id FROM users WHERE name = ?) AND type = 'GymSet'
            AND timestamp >= date('now', ?)
            GROUP BY date(timestamp)
        """, (perfil, f'-{dias} days'))
        return [dict(r) for r in cur.fetchall()]

def obtener_eventos_timeline(perfil: str, limit: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM activity_logs 
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
            ORDER BY timestamp DESC LIMIT ?
        """, (perfil, limit))
        return [dict(r) for r in cur.fetchall()]

def obtener_ayuno(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM fasting WHERE user_id = (SELECT id FROM users WHERE name = ?)", (perfil,))
        row = cur.fetchone()
        return dict(row) if row else {}

def actualizar_ayuno(perfil: str, en_ayuno: bool, inicio_iso: str, meta_horas: float):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u_id = cur.fetchone()['id']
        cur.execute("""
            INSERT INTO fasting (user_id, start_time, hours_goal, is_active)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                start_time=excluded.start_time,
                hours_goal=excluded.hours_goal,
                is_active=excluded.is_active
        """, (u_id, inicio_iso, meta_horas, 1 if en_ayuno else 0))
        conn.commit()

def eliminar_rutina_perfil(perfil: str, rutina_id: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM routine_exercises WHERE routine_id = ?", (rutina_id,))
        cur.execute("DELETE FROM routines WHERE id = ?", (rutina_id,))
        conn.commit()

def eliminar_evento_perfil(perfil: str, evento_id: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM activity_logs WHERE id = ?", (evento_id,))
        conn.commit()
