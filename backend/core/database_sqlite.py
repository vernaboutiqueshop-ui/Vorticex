# c:\Users\Gonzalo\entrenador-ia\backend\core\database_sqlite.py
import datetime
import json
import os
import sqlite3
import bcrypt
from functools import lru_cache

# Cache simple en memoria para datos que no cambian frecuentemente
_exercises_cache = None
_exercises_cache_timestamp = None

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


def obtener_perfil(nombre: str):
    with get_conn() as conn:
        cur = conn.cursor()

        # Lógica de Decaimiento de EXP (Penalización por no entrenar)
        hoy_date = datetime.datetime.now().strftime("%Y-%m-%d")
        cur.execute(
            """
            SELECT id, exp, level, last_penalty_date FROM users WHERE LOWER(name) = LOWER(?)
        """,
            (nombre,),
        )
        u = cur.fetchone()

        if u:
            uid = u["id"]
            exp = u["exp"] if u["exp"] else 0
            nivel = u["level"] if u["level"] else 1
            last_penalty = u["last_penalty_date"]

            # Chequeamos si hoy ya aplicamos la penalidad
            if last_penalty != hoy_date:
                # Buscamos último entrenamiento
                cur.execute(
                    "SELECT timestamp FROM activity_logs WHERE user_id = ? AND type = 'Gym' ORDER BY timestamp DESC LIMIT 1",
                    (uid,),
                )
                last_gym = cur.fetchone()

                if last_gym:
                    last_gym_date = datetime.datetime.strptime(
                        last_gym["timestamp"][:10], "%Y-%m-%d"
                    )
                    hoy_dt = datetime.datetime.strptime(hoy_date, "%Y-%m-%d")
                    dias_sin_gym = (hoy_dt - last_gym_date).days

                    if dias_sin_gym > 1:
                        # Restar 10 exp por cada día, sin bajar de 0
                        exp_perdida = (dias_sin_gym - 1) * 10
                        nueva_exp = max(0, exp - exp_perdida)

                        cur.execute(
                            "UPDATE users SET exp = ?, last_penalty_date = ? WHERE id = ?",
                            (nueva_exp, hoy_date, uid),
                        )
                        conn.commit()
                        print(
                            f"Penalización de {exp_perdida} EXP aplicada al usuario {nombre}."
                        )

        # Obtener datos frescos
        cur.execute("SELECT * FROM users WHERE LOWER(name) = LOWER(?)", (nombre,))
        row = cur.fetchone()
        if row:
            res = dict(row)
            res.pop("password", None)
            res["descripcion"] = (
                f"Meta: {res.get('goal')}. Peso: {res.get('weight')}kg."
            )
            res["objetivo_ia"] = res.get("goal")
            res["memoria_viva"] = res.get("memoria_viva", "Sin contexto generado aún.")
            return res
    return None


def obtener_password_hash(nombre: str) -> str:
    """Returns the stored password hash for authentication only."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT password FROM users WHERE LOWER(name) = LOWER(?)", (nombre,))
        row = cur.fetchone()
        return row["password"] if row else ""


def obtener_memoria_perfil(nombre: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT memoria_viva FROM users WHERE name = ?", (nombre,))
        row = cur.fetchone()
        if row:
            return {"contexto_narrativo": row["memoria_viva"]}
    return {"contexto_narrativo": "Sin contexto generado aún."}


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        # Fallback: si el hash guardado es texto plano (legacy), comparamos directo
        return plain == hashed


def guardar_perfil(nombre: str, data: dict):
    # Extraemos datos, priorizando los campos directos o los de data
    weight = data.get("peso", data.get("weight", 0))
    goal = data.get("objetivo_ia", data.get("goal", ""))
    email = data.get("email", f"{nombre}@vortice.local")
    raw_password = data.get("password", "123456")
    hashed_password = _hash_password(raw_password)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (name, email, weight, goal, password)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                weight=excluded.weight,
                goal=excluded.goal,
                password=excluded.password
        """,
            (nombre, email, weight, goal, hashed_password),
        )
        conn.commit()


def listar_perfiles():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM users")
        return {row["name"]: {"id": row["name"]} for row in cur.fetchall()}


# --- CATALOGO (Mapeo de Categor\u00eda Anterior Eliminado) ---


# --- CATALOGO (Arquitectura Intel v2) ---
def obtener_catalogo_completo(lang="es"):
    global _exercises_cache, _exercises_cache_timestamp
    
    # Cache por 5 minutos (300 segundos)
    if _exercises_cache is not None and _exercises_cache_timestamp is not None:
        if (datetime.datetime.now() - _exercises_cache_timestamp).seconds < 300:
            return _exercises_cache
    
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT e.id, e.gif_url, e.equipment, e.difficulty,
                   i.name as nombre_es, i.instructions as instrucciones_es,
                   c_zone.name_es as zone_name,
                   c_group.name_es as group_name,
                   c_mech.name_es as mechanic_name
            FROM exercises e
            JOIN exercise_i18n i ON e.id = i.exercise_id AND i.lang = ?
            LEFT JOIN exercise_categories c_zone ON e.zone_id = c_zone.id
            LEFT JOIN exercise_categories c_group ON e.group_id = c_group.id
            LEFT JOIN exercise_categories c_mech ON e.mechanic_id = c_mech.id
        """,
            (lang,),
        )
        rows = cur.fetchall()

        catalogo = []
        for r in rows:
            # Para el frontend, 'body_part' ahora es el nombre del grupo (Biceps, Pecho, etc.)
            # y 'target' puede ser la zona o la mecanica.
            inst_str = r["instrucciones_es"] or ""
            # Intentamos parsear si fuera JSON, si no, lista de un elemento
            try:
                inst_list = (
                    json.loads(inst_str)
                    if (inst_str.startswith("[") or inst_str.startswith("{"))
                    else [inst_str]
                )
            except:
                inst_list = [inst_str] if inst_str else []

            catalogo.append(
                {
                    "id_ejercicio": r["id"],
                    "nombre_es": r["nombre_es"],
                    "body_part": r["group_name"] or "General",
                    "zone": r["zone_name"],
                    "mechanic": r["mechanic_name"],
                    "target": r["group_name"],
                    "equipment": r["equipment"],
                    "difficulty_level": r["difficulty"],
                    "instrucciones_es": inst_list,
                    "gif_url": f"/gifs/{r['id']}.gif",
                }
            )
        # Guardar en cache
        _exercises_cache = catalogo
        _exercises_cache_timestamp = datetime.datetime.now()
        return catalogo


def buscar_ejercicios_textual(query: str, lang="es"):
    with get_conn() as conn:
        cur = conn.cursor()
        q = f"%{query}%"
        cur.execute(
            """
            SELECT e.id, i.name as nombre_es, c_group.name_es as group_name
            FROM exercises e
            JOIN exercise_i18n i ON e.id = i.exercise_id AND i.lang = ?
            LEFT JOIN exercise_categories c_group ON e.group_id = c_group.id
            WHERE i.name LIKE ? OR c_group.name_es LIKE ?
            LIMIT 20
        """,
            (lang, q, q),
        )
        return [dict(r) for r in cur.fetchall()]


def buscar_ejercicios_por_ids(ids: list, lang="es"):
    if not ids:
        return []
    with get_conn() as conn:
        cur = conn.cursor()
        placeholders = ", ".join(["?"] * len(ids))
        cur.execute(
            f"""
            SELECT e.id, e.gif_url, e.equipment,
                   i.name as nombre_es, i.instructions as instrucciones_es,
                   c_group.name_es as group_name
            FROM exercises e
            JOIN exercise_i18n i ON e.id = i.exercise_id AND i.lang = ?
            LEFT JOIN exercise_categories c_group ON e.group_id = c_group.id
            WHERE e.id IN ({placeholders})
        """,
            [lang] + ids,
        )

        ejercicios = []
        for r in cur.fetchall():
            inst_str = r["instrucciones_es"] or ""
            try:
                inst_list = (
                    json.loads(inst_str)
                    if (inst_str.startswith("[") or inst_str.startswith("{"))
                    else [inst_str]
                )
            except:
                inst_list = [inst_str] if inst_str else []

            ejercicios.append(
                {
                    "id_ejercicio": r["id"],
                    "nombre_es": r["nombre_es"],
                    "body_part": r["group_name"] or "General",
                    "target": r["group_name"],
                    "equipment": r["equipment"],
                    "instrucciones_es": inst_list,
                    "gif_url": f"/gifs/{r['id']}.gif",
                }
            )
        return ejercicios


def buscar_ejercicio_por_id(id_ej: str, lang="es"):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT e.*, i.name as nombre_es, i.instructions as instrucciones_es,
                   c_group.name_es as group_name
            FROM exercises e
            JOIN exercise_i18n i ON e.id = i.exercise_id AND i.lang = ?
            LEFT JOIN exercise_categories c_group ON e.group_id = c_group.id
            WHERE e.id = ?
        """,
            (lang, id_ej),
        )
        row = cur.fetchone()
        if row:
            r = dict(row)
            r["id_ejercicio"] = r["id"]
            r["nombre_es"] = r["nombre_es"]
            r["body_part"] = r["group_name"]
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
        user_id = user["id"] if user else 1  # Fallback al primer user

        cur.execute(
            """
            INSERT INTO activity_logs (user_id, type, description)
            VALUES (?, 'Chat', ?)
        """,
            (user_id, f"{rol}: {contenido}"),
        )
        conn.commit()


def obtener_historial_chat(perfil: str, limite: int = 20):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT description FROM activity_logs
            JOIN users ON users.id = activity_logs.user_id
            WHERE users.name = ? AND type = 'Chat'
            ORDER BY timestamp DESC LIMIT ?
        """,
            (perfil, limite),
        )
        rows = cur.fetchall()
        # Desglosar 'rol: contenido'
        hist = []
        for r in reversed(rows):
            parts = r["description"].split(": ", 1)
            if len(parts) == 2:
                hist.append({"rol": parts[0], "contenido": parts[1]})
        return hist


# --- NUTRICION / EVENTOS ---
def guardar_evento(
    perfil: str,
    tipo: str,
    desc: str,
    humor: str,
    cal: float,
    prot: float = 0,
    carb: float = 0,
    gras: float = 0,
    duration: int = 0,
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        user = cur.fetchone()
        u_id = user["id"] if user else 1

        cur.execute(
            """
            INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, val4, val5)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (u_id, tipo, desc, cal, prot, carb, gras, duration),
        )
        conn.commit()


def obtener_comidas_hoy(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        hoy = _today()
        cur.execute(
            """
            SELECT activity_logs.* FROM activity_logs
            JOIN users ON users.id = activity_logs.user_id
            WHERE users.name = ? AND type = 'Nutricion'
            AND date(timestamp) = ?
        """,
            (perfil, hoy),
        )
        return [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "descripcion": r["description"],
                "calorias": r["val1"],
                "proteinas": r["val2"],
                "carbos": r["val3"],
                "grasas": r["val4"],
            }
            for r in cur.fetchall()
        ]


def obtener_macros_hoy(perfil: str):
    comidas = obtener_comidas_hoy(perfil)
    return {
        "calorias": sum(float(c.get("cal") or 0) for c in comidas),
        "proteinas": sum(float(c.get("prot") or 0) for c in comidas),
        "carbos": sum(float(c.get("carb") or 0) for c in comidas),
        "grasas": sum(float(c.get("gras") or 0) for c in comidas),
    }


# --- RUTINAS ---
def guardar_rutina(perfil: str, nombre: str, descripcion: str, ejercicios: list):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u_id = cur.fetchone()["id"]

        cur.execute(
            "INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)",
            (u_id, nombre, descripcion),
        )
        r_id = cur.lastrowid

        for i, ex in enumerate(ejercicios):
            cur.execute(
                """
                INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, order_index)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    r_id,
                    ex.get("id_ejercicio", ex.get("id")),
                    ex.get("series", 3),
                    ex.get("reps", "12"),
                    i,
                ),
            )
        conn.commit()


def obtener_rutinas(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT routines.* FROM routines
            JOIN users ON users.id = routines.user_id
            WHERE users.name = ?
        """,
            (perfil,),
        )
        rutinas = []
        for r in cur.fetchall():
            cur.execute(
                "SELECT * FROM routine_exercises WHERE routine_id = ?", (r["id"],)
            )
            exs = [dict(e) for e in cur.fetchall()]
            rutinas.append(
                {
                    "id": r["id"],
                    "nombre": r["name"],
                    "descripcion": r["description"],
                    "ejercicios": exs,
                    "fecha": r["created_at"],
                }
            )
        return rutinas


# COMPATIBILIDAD
def consultar_datos(tabla: str, perfil: str):
    # Mapeo genérico para evitar errores
    if tabla == "alacena":
        return obtener_alacena(perfil)
    if tabla == "entrenamientos":
        return obtener_entrenamientos_resumen(perfil, 30)
    return []


def borrar_historial_chat(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            DELETE FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?) AND type = 'Chat'
        """,
            (perfil,),
        )
        conn.commit()


def guardar_log_set(
    perfil: str,
    id_ejercicio: str,
    set_num: int,
    peso: float,
    reps: int,
    target: str = "",
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        res = cur.fetchone()
        u_id = res["id"] if res else 1
        cur.execute(
            """
            INSERT INTO activity_logs (user_id, type, description, val1, val2, ref_id)
            VALUES (?, 'GymSet', ?, ?, ?, ?)
        """,
            (u_id, f"Set {set_num} de {id_ejercicio}", peso, reps, id_ejercicio),
        )
        conn.commit()


def obtener_ultimo_peso(perfil: str, id_ejercicio: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT val1 FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
            AND type = 'GymSet' AND ref_id = ?
            ORDER BY timestamp DESC LIMIT 1
        """,
            (perfil, id_ejercicio),
        )
        res = cur.fetchone()
        return res["val1"] if res else None


def obtener_alacena(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, ingredient as ingrediente, amount as cantidad, calories as calorias
            FROM pantry
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
        """,
            (perfil,),
        )
        return [dict(r) for r in cur.fetchall()]


def guardar_en_alacena(
    perfil: str, ingrediente: str, cantidad: str, calorias: float = 0
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        res = cur.fetchone()
        u_id = res["id"] if res else 1
        cur.execute(
            """
            INSERT INTO pantry (user_id, ingredient, amount, calories)
            VALUES (?, ?, ?, ?)
        """,
            (u_id, ingrediente, cantidad, calorias),
        )
        conn.commit()


def eliminar_de_alacena_perfil(perfil: str, item_id: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM pantry WHERE id = ?", (item_id,))
        conn.commit()


def obtener_entrenamientos_resumen(perfil: str, dias: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT date(timestamp) as fecha, count(*) as series, sum(val1 * val2) as volumen
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?) AND type = 'GymSet'
            AND timestamp >= date('now', ?)
            GROUP BY date(timestamp)
        """,
            (perfil, f"-{dias} days"),
        )
        return [dict(r) for r in cur.fetchall()]


def obtener_eventos_timeline(perfil: str, limit: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT * FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
            ORDER BY timestamp DESC LIMIT ?
        """,
            (perfil, limit),
        )
        return [dict(r) for r in cur.fetchall()]


def obtener_ayuno(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM fasting WHERE user_id = (SELECT id FROM users WHERE name = ?)",
            (perfil,),
        )
        row = cur.fetchone()
        return dict(row) if row else {}


def actualizar_ayuno(perfil: str, en_ayuno: bool, inicio_iso: str, meta_horas: float):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        res = cur.fetchone()
        u_id = res["id"] if res else 1
        cur.execute(
            """
            INSERT INTO fasting (user_id, start_time, hours_goal, is_active)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                start_time=excluded.start_time,
                hours_goal=excluded.hours_goal,
                is_active=excluded.is_active
        """,
            (u_id, inicio_iso, meta_horas, 1 if en_ayuno else 0),
        )
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


def obtener_memoria_perfil(nombre: str):
    """Retorna el contexto narrativo guardado en la tabla users."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT memoria_viva FROM users WHERE name = ?", (nombre,))
        res = cur.fetchone()
        return (
            {"contexto_narrativo": res["memoria_viva"]}
            if res
            else {"contexto_narrativo": "Sin contexto generado aún."}
        )


def obtener_comidas_hoy(perfil: str):
    """Retorna la lista de eventos de nutrición del día."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, description as alimento, val1 as cal, val2 as prot, val3 as carb, val4 as gras, timestamp
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
            AND type = 'Nutricion'
            AND date(timestamp) = date('now')
            ORDER BY timestamp DESC
        """,
            (perfil,),
        )
        return [dict(r) for r in cur.fetchall()]


def guardar_rutina_template(
    perfil: str, nombre: str, ejercicios: list, folder_id: int = None
):
    with get_conn() as conn:
        cur = conn.cursor()
        # Obtener user_id
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        u = cur.fetchone()
        uid = u["id"] if u else 1

        cur.execute(
            "INSERT INTO routines (user_id, name, folder_id, active, created_at) VALUES (?, ?, ?, 1, ?)",
            (uid, nombre, folder_id, _now()),
        )
        rid = cur.lastrowid

        for idx, ej in enumerate(ejercicios):
            eid = ej.get("id_ejercicio")
            # sets_data: List of {type: 'normal'|'warmup'|'dropset'|'failure', reps: 10, weight: 0}
            sets_data = json.dumps(ej.get("sets_data", []))
            notes = ej.get("notes", "")
            rest = ej.get("rest_seconds", 60)
            cur.execute(
                """
                INSERT INTO routine_exercises (routine_id, exercise_id, sets_data, notes, rest_seconds, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (rid, eid, sets_data, notes, rest, idx),
            )
        conn.commit()
    return rid


def obtener_rutinas_templates(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT routines.* FROM routines
            JOIN users ON users.id = routines.user_id
            WHERE LOWER(users.name) = LOWER(?) AND routines.active = 1
        """,
            (perfil,),
        )
        rutinas = [dict(r) for r in cur.fetchall()]
        for r in rutinas:
            cur.execute(
                """
                SELECT AVG(CAST(val1 AS INTEGER)) as avg_duration
                FROM activity_logs
                WHERE type = 'GymSession' AND val2 = ?
            """,
                (str(r["id"]),),
            )
            avg_res = cur.fetchone()
            r["avg_duration_seconds"] = (
                int(avg_res["avg_duration"])
                if avg_res and avg_res["avg_duration"]
                else 0
            )

            cur.execute(
                """
                SELECT re.exercise_id as id_ejercicio, re.sets_data, re.notes, re.rest_seconds,
                       i.name as nombre_es, i.name as name, c_group.name_es as group_name, e.gif_url,
                       e.equipment, e.difficulty
                FROM routine_exercises re
                JOIN exercises e ON e.id = re.exercise_id
                JOIN exercise_i18n i ON e.id = i.exercise_id AND i.lang = 'es'
                LEFT JOIN exercise_categories c_group ON e.group_id = c_group.id
                WHERE re.routine_id = ?
            """,
                (r["id"],),
            )
            r["ejercicios"] = []
            for e_row in cur.fetchall():
                e = dict(e_row)
                e["body_part"] = e["group_name"]
                e["target"] = e["group_name"]
                try:
                    e["sets_data"] = (
                        json.loads(e["sets_data"]) if e["sets_data"] else []
                    )
                except:
                    e["sets_data"] = []
                r["ejercicios"].append(e)
        return rutinas


def eliminar_rutina(rid: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE routines SET active = 0 WHERE id = ?", (rid,))
        conn.commit()


def actualizar_rutina_template(
    rid: int, nombre: str, ejercicios: list, folder_id: int = None
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE routines SET name = ?, folder_id = ? WHERE id = ?",
            (nombre, folder_id, rid),
        )

        cur.execute("DELETE FROM routine_exercises WHERE routine_id = ?", (rid,))
        for idx, ej in enumerate(ejercicios):
            eid = ej.get("id_ejercicio")
            sets_data = json.dumps(ej.get("sets_data", []))
            notes = ej.get("notes", "")
            rest = ej.get("rest_seconds", 60)
            cur.execute(
                """
                INSERT INTO routine_exercises (routine_id, exercise_id, sets_data, notes, rest_seconds, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (rid, eid, sets_data, notes, rest, idx),
            )
        conn.commit()
        return rid


def actualizar_perfil_elite(
    perfil: str, age: int, weight: float, height: float, language: str
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE users
            SET age = ?, weight = ?, height = ?, language = ?
            WHERE name = ?
        """,
            (age, weight, height, language, perfil),
        )
        conn.commit()


def actualizar_avatar_elite(perfil: str, profile_pic_url: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE users
            SET profile_pic = ?
            WHERE name = ?
        """,
            (profile_pic_url, perfil),
        )
        conn.commit()


def guardar_feedback(perfil: str, message: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE name = ?", (perfil,))
        u = cur.fetchone()
        uid = u["id"] if u else 1
        # Anti-spam: max 1 feedback per 60 seconds
        cur.execute(
            "SELECT COUNT(*) as cnt FROM feedback WHERE user_id = ? AND timestamp > datetime('now', '-60 seconds')",
            (uid,),
        )
        if cur.fetchone()["cnt"] > 0:
            return False
        cur.execute(
            "INSERT INTO feedback (user_id, message) VALUES (?, ?)", (uid, message)
        )
        conn.commit()
        return True


def obtener_feedback_admin():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT f.id, f.message, f.timestamp as created_at, f.admin_reply, f.replied_at,
                   u.name as user_name, u.profile_pic as user_avatar
            FROM feedback f
            JOIN users u ON u.id = f.user_id
            ORDER BY f.timestamp DESC
            LIMIT 100
        """)
        return [dict(r) for r in cur.fetchall()]


def responder_feedback(feedback_id: int, reply: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE feedback SET admin_reply = ?, replied_at = datetime('now') WHERE id = ?",
            (reply, feedback_id),
        )
        if cur.rowcount == 0:
            return None
        # Get user to create notification
        cur.execute("""
            SELECT f.user_id, u.name FROM feedback f
            JOIN users u ON u.id = f.user_id WHERE f.id = ?
        """, (feedback_id,))
        row = cur.fetchone()
        if row:
            cur.execute(
                "INSERT INTO notifications (user_id, type, from_user, post_id, message) VALUES (?, ?, ?, ?, ?)",
                (row["user_id"], "admin_reply", "Vórtice", 0, reply[:200]),
            )
        conn.commit()
        return row["name"] if row else None


def obtener_intensidad_muscular(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        # Buscamos logs de Gym de la última semana
        cur.execute(
            """
            SELECT val2 as target, COUNT(*) as series
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE name = ?)
            AND type = 'Gym'
            AND date(timestamp) >= date('now', '-7 days')
            GROUP BY val2
        """,
            (perfil,),
        )
        return [dict(r) for r in cur.fetchall()]


def obtener_intensidad_muscular_periodo(perfil: str, period: str = "week"):
    """
    Returns muscle intensity with exponential decay fatigue model.
    F_t = F_{t-1} · e^{-k·Δt} + E_t
    k ≈ 0.1/day  →  muscle "memory" fades ~50% in 7 days.
    period: 'week' (7d), 'month' (30d), 'quarter' (90d)
    """
    import math
    from datetime import datetime, timedelta

    PERIOD_DAYS = {"week": 7, "month": 30, "quarter": 90}
    days = PERIOD_DAYS.get(period, 7)
    k = 0.1  # decay constant per day

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT val2 as target, date(timestamp) as day, COUNT(*) as sets
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'Gym'
            AND date(timestamp) >= date('now', ?)
            GROUP BY val2, date(timestamp)
            ORDER BY date(timestamp) ASC
        """,
            (perfil, f"-{days} days"),
        )
        rows = cur.fetchall()

    # Group by muscle
    muscle_days = {}
    for r in rows:
        target = r["target"]
        if not target:
            continue
        if target not in muscle_days:
            muscle_days[target] = []
        muscle_days[target].append({"day": r["day"], "sets": r["sets"]})

    today = datetime.now().date()
    results = []

    for target, entries in muscle_days.items():
        fatigue = 0.0
        total_sets = 0
        total_volume_days = len(entries)
        last_day = None

        for entry in sorted(entries, key=lambda x: x["day"]):
            entry_date = datetime.strptime(entry["day"], "%Y-%m-%d").date()
            if last_day is not None:
                delta = (entry_date - last_day).days
                fatigue = fatigue * math.exp(-k * delta)
            fatigue += entry["sets"]
            total_sets += entry["sets"]
            last_day = entry_date

        # Decay to today
        if last_day is not None:
            delta_today = (today - last_day).days
            fatigue = fatigue * math.exp(-k * delta_today)

        # Freshness: days since last trained (lower = more recent)
        days_since = (today - last_day).days if last_day else days

        results.append({
            "target": target,
            "fatigue_score": round(fatigue, 2),
            "total_sets": total_sets,
            "sessions": total_volume_days,
            "days_since_last": days_since,
        })

    # Sort by fatigue descending
    results.sort(key=lambda x: x["fatigue_score"], reverse=True)

    # Compute max for normalization on frontend
    max_fatigue = max((r["fatigue_score"] for r in results), default=1)

    return {"muscles": results, "max_fatigue": max_fatigue, "period": period, "days": days}


def obtener_ultimos_pesos(perfil: str, exercise_ids: list):
    with get_conn() as conn:
        cur = conn.cursor()
        res = {}
        cur.execute(
            """
            SELECT val1 FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'Gym'
            ORDER BY timestamp DESC LIMIT 300
        """,
            (perfil,),
        )
        for row in cur.fetchall():
            parts = str(row["val1"]).split("|")
            if len(parts) == 3:
                eid, kg, reps = parts
                if eid in [str(i) for i in exercise_ids] and eid not in res:
                    res[eid] = {"kg": kg, "reps": reps}
        return res


def guardar_sesion_gym(perfil: str, rutina_data: list):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, exp, level FROM users WHERE LOWER(name) = LOWER(?)", (perfil,)
        )
        user = cur.fetchone()
        if not user:
            return {"status": "error"}

        uid = user["id"]
        exp_actual = user["exp"] if user["exp"] else 0
        nivel_actual = user["level"] if user["level"] else 1
        volumen_total = 0

        for ej in rutina_data:
            eid = ej.get("id_ejercicio", ej.get("id", ""))
            target = ej.get("target", "")
            for s in ej.get("sets", []):
                if s.get("done"):
                    try:
                        kg = float(s.get("kg") or 0)
                        reps = int(s.get("reps") or 0)
                    except:
                        kg, reps = 0, 0
                    volumen_total += kg * reps
                    val1 = f"{eid}|{kg}|{reps}"
                    cur.execute(
                        "INSERT INTO activity_logs (user_id, type, val1, val2) VALUES (?, 'Gym', ?, ?)",
                        (uid, val1, target),
                    )

        # 10kg = 1 EXP
        exp_ganada = int(volumen_total / 10)
        if exp_ganada == 0 and volumen_total > 0:
            exp_ganada = 10

        nueva_exp = exp_actual + exp_ganada
        nuevo_nivel = nivel_actual
        if nueva_exp >= (nuevo_nivel * 1000):
            nuevo_nivel += 1

        cur.execute(
            "UPDATE users SET exp = ?, level = ? WHERE id = ?",
            (nueva_exp, nuevo_nivel, uid),
        )
        conn.commit()
        return {
            "status": "success",
            "exp_ganada": exp_ganada,
            "nuevo_nivel": nuevo_nivel,
            "volumen": volumen_total,
        }


def eliminar_evento_historial(perfil: str, event_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        # Verificar que el evento pertenece al usuario
        cur.execute(
            """
            DELETE FROM activity_logs
            WHERE id = ? AND user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
        """,
            (event_id, perfil),
        )
        conn.commit()
        return True


def obtener_rutina_publica(routine_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.*, u.name as user_name
            FROM routines r
            JOIN users u ON u.id = r.user_id
            WHERE r.id = ?
        """,
            (routine_id,),
        )
        res = cur.fetchone()
        if not res:
            return None

        rutina = dict(res)
        cur.execute(
            """
            SELECT e.*, re.sets as sets_count, re.reps as reps_default
            FROM routine_exercises re
            JOIN exercises e ON e.id = re.exercise_id
            WHERE re.routine_id = ?
        """,
            (routine_id,),
        )
        rutina["ejercicios"] = [dict(e) for e in cur.fetchall()]
        return rutina


# --- COMUNIDAD ---
def obtener_posts(current_user: str = "Anonymous", limit: int = 15, offset: int = 0):
    with get_conn() as conn:
        cur = conn.cursor()
        query = """
            SELECT p.*, u.name as user_name, u.profile_pic as user_avatar, u.level as user_level,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))) as user_has_liked,
                   r.name as routine_name, r.id as routine_id
            FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN routines r ON r.id = p.routine_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        """
        cur.execute(query, (current_user, limit + 1, offset))
        rows = cur.fetchall()
        has_more = len(rows) > limit
        posts = []
        for r in rows[:limit]:
            post = dict(r)
            # Si tiene rutina, traer ejercicios
            if post["routine_id"]:
                cur.execute(
                    """
                    SELECT COALESCE(i18n.name, e.id) as name, 
                           COALESCE(cat.name_es, '') as target, 
                           e.id as exercise_id
                    FROM routine_exercises re
                    JOIN exercises e ON e.id = re.exercise_id
                    LEFT JOIN exercise_i18n i18n ON i18n.exercise_id = e.id AND i18n.lang = 'es'
                    LEFT JOIN exercise_categories cat ON cat.id = e.group_id
                    WHERE re.routine_id = ?
                """,
                    (post["routine_id"],),
                )
                ejercicios = []
                for row in cur.fetchall():
                    ex = dict(row)
                    # Usar ruta relativa para GIFs (mismo formato que ejercicios.json)
                    ex["gif_url"] = f"/gifs/{ex['exercise_id']}.gif"
                    ejercicios.append(ex)
                post["routine_exercises"] = ejercicios
            posts.append(post)
        return {"posts": posts, "has_more": has_more}


def obtener_perfil_publico(nombre: str):
    """Devuelve datos públicos de un usuario: avatar, nivel, EXP, posts recientes. Sin datos privados."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, level, exp, profile_pic, created_at FROM users WHERE LOWER(name) = LOWER(?)",
            (nombre,)
        )
        u = cur.fetchone()
        if not u:
            return None
        uid = u["id"]

        # Últimos 6 posts del usuario
        cur.execute(
            """SELECT p.id, p.content, p.created_at, p.media_type, p.image_url,
                      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                      r.name as routine_name
               FROM posts p
               LEFT JOIN routines r ON r.id = p.routine_id
               WHERE p.user_id = ?
               ORDER BY p.created_at DESC LIMIT 6""",
            (uid,)
        )
        posts = [dict(r) for r in cur.fetchall()]

        # Contar seguidores y siguiendo (la tabla puede no existir)
        try:
            cur.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (uid,))
            row = cur.fetchone()
            followers = row["c"] if row else 0
            cur.execute("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", (uid,))
            row = cur.fetchone()
            following = row["c"] if row else 0
        except Exception:
            followers = 0
            following = 0

        # Total posts
        cur.execute("SELECT COUNT(*) as c FROM posts WHERE user_id = ?", (uid,))
        row = cur.fetchone()
        total_posts = row["c"] if row else 0

        return {
            "name": u["name"],
            "level": u["level"] or 1,
            "exp": u["exp"] or 0,
            "profile_pic": u["profile_pic"],
            "created_at": u["created_at"],
            "followers": followers,
            "following": following,
            "total_posts": total_posts,
            "recent_posts": posts,
        }


def guardar_post(
    perfil: str, content: str, image_url: str = None, routine_id: int = None, media_type: str = None
):
    if image_url and len(image_url) > 4 * 1024 * 1024:
        raise ValueError("Media file too large (max 3MB)")
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        res = cur.fetchone()
        uid = res["id"] if res else 1
        cur.execute(
            """
            INSERT INTO posts (user_id, content, image_url, routine_id, media_type)
            VALUES (?, ?, ?, ?, ?)
        """,
            (uid, content, image_url, routine_id, media_type),
        )
        conn.commit()
        return cur.lastrowid


def _crear_notificacion(conn, post_id: int, from_user: str, ntype: str, message: str = ""):
    """Create a notification for the owner of post_id (skip if from_user == owner)."""
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM posts WHERE id = ?", (post_id,))
    post = cur.fetchone()
    if not post:
        return
    owner_id = post["user_id"]
    cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (from_user,))
    from_row = cur.fetchone()
    if not from_row or from_row["id"] == owner_id:
        return
    # Evitar notificaciones duplicadas de like del mismo usuario al mismo post
    if ntype == "like":
        cur.execute(
            "SELECT id FROM notifications WHERE user_id = ? AND type = ? AND from_user = ? AND post_id = ?",
            (owner_id, ntype, from_user, post_id),
        )
        if cur.fetchone():
            return
    cur.execute(
        "INSERT INTO notifications (user_id, type, from_user, post_id, message) VALUES (?, ?, ?, ?, ?)",
        (owner_id, ntype, from_user, post_id, message),
    )


def obtener_notificaciones(perfil: str, limit: int = 50):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT n.*, u.profile_pic as from_avatar
            FROM notifications n
            LEFT JOIN users u ON LOWER(u.name) = LOWER(n.from_user)
            WHERE n.user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            ORDER BY n.created_at DESC
            LIMIT ?
        """, (perfil, limit))
        return [dict(r) for r in cur.fetchall()]


def contar_notificaciones_no_leidas(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) as c FROM notifications
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND is_read = 0
        """, (perfil,))
        return cur.fetchone()["c"]


def marcar_notificaciones_leidas(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE notifications SET is_read = 1
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND is_read = 0
        """, (perfil,))
        conn.commit()
        return cur.rowcount


def toggle_like(post_id: int, user: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (user,))
        res = cur.fetchone()
        if not res:
            return False
        uid = res["id"]

        cur.execute(
            "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
            (post_id, uid),
        )
        like = cur.fetchone()

        if like:
            cur.execute("DELETE FROM post_likes WHERE id = ?", (like["id"],))
            liked = False
        else:
            cur.execute(
                "INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)",
                (post_id, uid),
            )
            liked = True
            _crear_notificacion(conn, post_id, user, "like")
        conn.commit()
        return liked


def obtener_comentarios(post_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.*, u.name as user_name, u.profile_pic as user_avatar
            FROM post_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        """,
            (post_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def guardar_comentario(post_id: int, user: str, content: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (user,))
        res = cur.fetchone()
        if not res:
            return None
        uid = res["id"]
        cur.execute(
            """
            INSERT INTO post_comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        """,
            (post_id, uid, content),
        )
        _crear_notificacion(conn, post_id, user, "comment", content[:100])
        conn.commit()
        return cur.lastrowid


def eliminar_post(post_id: int, user: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (user,))
        u = cur.fetchone()
        if not u:
            return False
        uid = u["id"]
        cur.execute("SELECT id FROM posts WHERE id = ? AND user_id = ?", (post_id, uid))
        if not cur.fetchone():
            return False
        cur.execute("DELETE FROM post_likes WHERE post_id = ?", (post_id,))
        cur.execute("DELETE FROM post_comments WHERE post_id = ?", (post_id,))
        cur.execute("DELETE FROM posts WHERE id = ? AND user_id = ?", (post_id, uid))
        conn.commit()
        return True


def eliminar_comentario(comment_id: int, user: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (user,))
        u = cur.fetchone()
        if not u:
            return False
        uid = u["id"]
        cur.execute("SELECT id FROM post_comments WHERE id = ? AND user_id = ?", (comment_id, uid))
        if not cur.fetchone():
            return False
        cur.execute("DELETE FROM post_comments WHERE id = ? AND user_id = ?", (comment_id, uid))
        conn.commit()
        return True


def clonar_rutina(routine_id: int, perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        u = cur.fetchone()
        if not u:
            return None
        uid = u["id"]
        cur.execute("SELECT * FROM routines WHERE id = ?", (routine_id,))
        orig = cur.fetchone()
        if not orig:
            return None
        orig = dict(orig)
        cur.execute(
            "INSERT INTO routines (user_id, name, folder_id, active, created_at) VALUES (?, ?, NULL, 1, ?)",
            (uid, orig["name"] + " (clon)", _now()),
        )
        new_rid = cur.lastrowid
        cur.execute("SELECT * FROM routine_exercises WHERE routine_id = ?", (routine_id,))
        for ex in cur.fetchall():
            ex = dict(ex)
            cur.execute(
                """INSERT INTO routine_exercises (routine_id, exercise_id, sets_data, notes, rest_seconds, order_index)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (new_rid, ex["exercise_id"], ex.get("sets_data", "[]"), ex.get("notes", ""), ex.get("rest_seconds", 60), ex.get("order_index", 0)),
            )
        conn.commit()
        return new_rid


def obtener_conteos_ejercicios():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM exercises")
        total = cur.fetchone()["total"]

        cur.execute("""
            SELECT c.name_es as name, COUNT(*) as count
            FROM exercises e
            JOIN exercise_categories c ON e.group_id = c.id
            GROUP BY c.name_es
        """)
        raw_counts = cur.fetchall()

        by_muscle = {row["name"]: row["count"] for row in raw_counts}
        return {"total": total, "by_muscle": by_muscle}


def obtener_carpetas(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT f.*,
                   (SELECT COUNT(*) FROM routines WHERE folder_id = f.id AND active = 1) as routines_count
            FROM gym_folders f
            WHERE LOWER(f.perfil) = LOWER(?)
        """,
            (perfil,),
        )
        return [dict(r) for r in cur.fetchall()]


MAX_FOLDERS = 6


def guardar_carpeta(perfil: str, nombre: str, color: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) as cnt FROM gym_folders WHERE LOWER(perfil) = LOWER(?)",
            (perfil,),
        )
        count = cur.fetchone()["cnt"]
        if count >= MAX_FOLDERS:
            raise ValueError(f"Máximo {MAX_FOLDERS} carpetas permitidas")
        cur.execute(
            "INSERT INTO gym_folders (perfil, name, color) VALUES (?, ?, ?)",
            (perfil, nombre, color),
        )
        conn.commit()
        return cur.lastrowid


def eliminar_carpeta(fid: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE routines SET folder_id = NULL WHERE folder_id = ?", (fid,))
        cur.execute("DELETE FROM gym_folders WHERE id = ?", (fid,))
        conn.commit()


def obtener_historial_gym(perfil: str, limit: int = 30):
    """Return gym session history from activity_logs for a user."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT al.id, al.type, al.description, al.val1 as exp_gained,
                   al.val2 as routine_id, al.val5 as duration_seconds,
                   al.val3 as rating, al.timestamp
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            WHERE LOWER(u.name) = LOWER(?) AND al.type = 'GymSession'
            ORDER BY al.timestamp DESC
            LIMIT ?
            """,
            (perfil, limit),
        )
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            # Try to get routine name from routine_id
            rid = d.get("routine_id")
            if rid:
                try:
                    rid_int = int(float(rid))
                    cur.execute("SELECT name FROM routines WHERE id = ?", (rid_int,))
                    rrow = cur.fetchone()
                    d["routine_name"] = rrow["name"] if rrow else None
                except:
                    d["routine_name"] = None
            else:
                d["routine_name"] = None
            result.append(d)
        return result


def obtener_historial_unificado(perfil: str, limit: int = 40):
    """Return merged gym + sport history sorted by timestamp."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT al.id, al.type, al.description, al.val1, al.val2, al.val3,
                   al.val5, al.timestamp, al.ref_id
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            WHERE LOWER(u.name) = LOWER(?) AND al.type IN ('GymSession', 'Sport')
            ORDER BY al.timestamp DESC
            LIMIT ?
        """, (perfil, limit))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d["type"] == "GymSession":
                rid = d.get("val2")
                routine_name = None
                if rid:
                    try:
                        cur.execute("SELECT name FROM routines WHERE id = ?", (int(float(rid)),))
                        rrow = cur.fetchone()
                        routine_name = rrow["name"] if rrow else None
                    except:
                        pass
                result.append({
                    "id": d["id"],
                    "kind": "gym",
                    "timestamp": d["timestamp"],
                    "exp_gained": int(float(d["val1"] or 0)),
                    "routine_name": routine_name,
                    "duration_seconds": d["val5"],
                    "rating": int(float(d["val3"] or 0)),
                    "description": d["description"],
                })
            else:  # Sport
                cals = int(float(d["val2"] or 0))
                result.append({
                    "id": d["id"],
                    "kind": "sport",
                    "timestamp": d["timestamp"],
                    "sport_name": d["description"],
                    "duracion_min": float(d["val1"] or 0),
                    "calorias": cals,
                    "intensidad": int(float(d["val3"] or 0)),
                    "exp_gained": max(5, cals // 10),
                    "rating": 0,
                })
        return result


def actualizar_rating_sesion(event_id: int, perfil: str, rating: int):
    """Update the star rating on a gym session event."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE activity_logs SET val3 = ?
            WHERE id = ? AND user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            """,
            (rating, event_id, perfil),
        )
        conn.commit()
        return cur.rowcount > 0


# --- GAMIFICATION ---
def obtener_racha(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT DATE(timestamp) as day
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type IN ('GymSet', 'Gym', 'GymSession')
            ORDER BY day DESC
            LIMIT 60
        """, (perfil,))
        days = [r["day"] for r in cur.fetchall()]
        if not days:
            return {"current_streak": 0, "best_streak": 0, "total_workouts": 0}

        from datetime import datetime, timedelta
        today = datetime.now().date()
        streak = 0
        for i, d in enumerate(days):
            target = today - timedelta(days=i)
            if datetime.strptime(d, "%Y-%m-%d").date() == target:
                streak += 1
            else:
                if i == 0 and datetime.strptime(d, "%Y-%m-%d").date() == today - timedelta(days=1):
                    streak += 1
                    continue
                break

        best = streak
        cur_streak = 1
        for i in range(1, len(days)):
            d1 = datetime.strptime(days[i - 1], "%Y-%m-%d").date()
            d2 = datetime.strptime(days[i], "%Y-%m-%d").date()
            if (d1 - d2).days == 1:
                cur_streak += 1
                best = max(best, cur_streak)
            else:
                cur_streak = 1

        cur.execute("""
            SELECT COUNT(*) as c FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'GymSession'
        """, (perfil,))
        total = cur.fetchone()["c"]
        return {"current_streak": streak, "best_streak": best, "total_workouts": total}


# --- FOLLOWERS ---
def toggle_follow(follower_name: str, following_name: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (follower_name,))
        f1 = cur.fetchone()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (following_name,))
        f2 = cur.fetchone()
        if not f1 or not f2 or f1["id"] == f2["id"]:
            return False
        fid, tid = f1["id"], f2["id"]
        cur.execute("SELECT id FROM followers WHERE follower_id = ? AND following_id = ?", (fid, tid))
        existing = cur.fetchone()
        if existing:
            cur.execute("DELETE FROM followers WHERE id = ?", (existing["id"],))
            conn.commit()
            return False
        else:
            cur.execute("INSERT INTO followers (follower_id, following_id) VALUES (?, ?)", (fid, tid))
            conn.commit()
            return True


def obtener_seguidores(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.name, u.profile_pic, u.level
            FROM followers f
            JOIN users u ON u.id = f.follower_id
            WHERE f.following_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            ORDER BY f.created_at DESC
        """, (perfil,))
        return [dict(r) for r in cur.fetchall()]


def obtener_seguidos(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.name, u.profile_pic, u.level
            FROM followers f
            JOIN users u ON u.id = f.following_id
            WHERE f.follower_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            ORDER BY f.created_at DESC
        """, (perfil,))
        return [dict(r) for r in cur.fetchall()]


def obtener_follow_counts(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        u = cur.fetchone()
        if not u:
            return {"followers": 0, "following": 0}
        uid = u["id"]
        cur.execute("SELECT COUNT(*) as c FROM followers WHERE following_id = ?", (uid,))
        followers = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) as c FROM followers WHERE follower_id = ?", (uid,))
        following = cur.fetchone()["c"]
        return {"followers": followers, "following": following}


def is_following(follower_name: str, following_name: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) as c FROM followers
            WHERE follower_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND following_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
        """, (follower_name, following_name))
        return cur.fetchone()["c"] > 0


# ═══════════════════════════════════════════════════════════════════
# DEPORTES — user_sports + sesiones deportivas con cálculo MET
# ═══════════════════════════════════════════════════════════════════

# MET values (Metabolic Equivalent of Task) — fuente: Compendium of Physical Activities
SPORT_MET_VALUES = {
    "natación": 8.0, "natacion": 8.0, "swimming": 8.0,
    "fútbol": 7.0, "futbol": 7.0, "soccer": 7.0, "football": 7.0,
    "rugby": 8.3,
    "básquet": 6.5, "basquet": 6.5, "basketball": 6.5,
    "tenis": 7.3, "tennis": 7.3,
    "pádel": 6.0, "padel": 6.0,
    "ciclismo": 7.5, "cycling": 7.5, "bicicleta": 7.5,
    "correr": 9.8, "running": 9.8,
    "caminar": 3.8, "walking": 3.8, "caminata": 3.8,
    "boxeo": 7.8, "boxing": 7.8,
    "artes marciales": 10.3, "martial arts": 10.3, "mma": 10.3, "karate": 10.3, "judo": 10.3, "taekwondo": 10.3,
    "crossfit": 8.0,
    "yoga": 3.0,
    "pilates": 3.5,
    "escalada": 8.0, "climbing": 8.0,
    "remo": 7.0, "rowing": 7.0,
    "hockey": 8.0,
    "volleyball": 4.0, "vóley": 4.0, "voley": 4.0,
    "handball": 8.0,
    "surf": 5.0,
    "esquí": 7.0, "esqui": 7.0, "skiing": 7.0,
    "patín": 7.0, "patin": 7.0, "skating": 7.0, "rollers": 7.0,
    "bailar": 5.5, "dance": 5.5, "baile": 5.5,
    "senderismo": 6.0, "hiking": 6.0, "trekking": 6.0,
    "saltar la cuerda": 11.0, "jump rope": 11.0,
    "golf": 4.3,
    "cricket": 5.0,
    "softball": 5.0,
    "béisbol": 5.0, "beisbol": 5.0, "baseball": 5.0,
}
DEFAULT_MET = 5.0  # For custom/unknown sports


def _get_met_for_sport(sport_name: str) -> float:
    """Lookup MET value for a sport by name (case-insensitive fuzzy match)."""
    name_lower = sport_name.lower().strip()
    if name_lower in SPORT_MET_VALUES:
        return SPORT_MET_VALUES[name_lower]
    # Partial match
    for key, met in SPORT_MET_VALUES.items():
        if key in name_lower or name_lower in key:
            return met
    return DEFAULT_MET


def calcular_calorias_deporte(peso_kg: float, deporte: str, duracion_min: float, intensidad: int = 5) -> dict:
    """
    Calcula calorías quemadas usando la fórmula MET:
    Calorías = MET × peso_kg × duración_horas × factor_intensidad
    
    intensidad: 1-10, donde 5 = normal, 10 = máxima
    El factor_intensidad ajusta ±40% sobre el MET base
    """
    met_base = _get_met_for_sport(deporte)
    # Ajustar MET por intensidad (1=−40%, 5=0%, 10=+40%)
    factor = 0.6 + (intensidad - 1) * (0.8 / 9)  # rango 0.6 a 1.4
    met_ajustado = met_base * factor
    horas = duracion_min / 60.0
    calorias = met_ajustado * peso_kg * horas
    return {
        "calorias": round(calorias),
        "met_base": met_base,
        "met_ajustado": round(met_ajustado, 1),
        "factor_intensidad": round(factor, 2),
    }


def _ensure_user_sports_table():
    """Create user_sports table if it doesn't exist."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_sports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                icon TEXT DEFAULT '⚡',
                color TEXT DEFAULT '#06b6d4',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()


# Auto-migrate on import
_ensure_user_sports_table()


def obtener_deportes_usuario(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT s.id, s.name, s.icon, s.color
            FROM user_sports s
            JOIN users u ON u.id = s.user_id
            WHERE LOWER(u.name) = LOWER(?)
            ORDER BY s.name
        """, (perfil,))
        return [dict(r) for r in cur.fetchall()]


def agregar_deporte_usuario(perfil: str, name: str, icon: str = "⚡", color: str = "#06b6d4"):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        if not user:
            return None
        cur.execute(
            "INSERT INTO user_sports (user_id, name, icon, color) VALUES (?, ?, ?, ?)",
            (user["id"], name.strip(), icon, color)
        )
        conn.commit()
        return cur.lastrowid


def eliminar_deporte_usuario(sport_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM user_sports WHERE id = ?", (sport_id,))
        conn.commit()


def registrar_sesion_deporte(perfil: str, sport_name: str, duracion_min: float, intensidad: int = 5, sport_id: int = None):
    """
    Registra una sesión deportiva en activity_logs y otorga EXP.
    Calcula calorías basándose en peso del usuario + MET del deporte.
    """
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, weight, exp, level FROM users WHERE LOWER(name) = LOWER(?)", (perfil,)
        )
        user = cur.fetchone()
        if not user:
            return {"status": "error", "error": "User not found"}

        uid = user["id"]
        peso = user["weight"] or 70.0  # default 70kg if not set
        exp_actual = user["exp"] or 0
        nivel_actual = user["level"] or 1

        # Calcular calorías
        cal_data = calcular_calorias_deporte(peso, sport_name, duracion_min, intensidad)
        calorias = cal_data["calorias"]

        # Registrar en activity_logs
        cur.execute("""
            INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, ref_id)
            VALUES (?, 'Sport', ?, ?, ?, ?, ?)
        """, (uid, sport_name, duracion_min, calorias, intensidad, str(sport_id or "")))
        session_id = cur.lastrowid
        conn.commit()

        # EXP: 1 EXP por cada 10 calorías quemadas (mínimo 5)
        exp_ganada = max(5, int(calorias / 10))
        nueva_exp = exp_actual + exp_ganada
        nuevo_nivel = nivel_actual
        if nueva_exp >= (nuevo_nivel * 1000):
            nuevo_nivel += 1

        cur.execute(
            "UPDATE users SET exp = ?, level = ? WHERE id = ?",
            (nueva_exp, nuevo_nivel, uid)
        )
        conn.commit()

        return {
            "status": "success",
            "session_id": session_id,
            "calorias": calorias,
            "met_base": cal_data["met_base"],
            "met_ajustado": cal_data["met_ajustado"],
            "duracion_min": duracion_min,
            "intensidad": intensidad,
            "exp_ganada": exp_ganada,
            "nuevo_nivel": nuevo_nivel,
        }


def obtener_historial_deportes(perfil: str, limit: int = 30):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT al.id, al.description as sport_name, 
                   al.val1 as duracion_min, al.val2 as calorias,
                   al.val3 as intensidad, al.timestamp
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            WHERE LOWER(u.name) = LOWER(?) AND al.type = 'Sport'
            ORDER BY al.timestamp DESC LIMIT ?
        """, (perfil, limit))
        return [dict(r) for r in cur.fetchall()]


# ── NUTRITION GOALS ──
def _ensure_nutrition_goals_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS nutrition_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                cal_goal REAL DEFAULT 2200,
                prot_goal REAL DEFAULT 150,
                carb_goal REAL DEFAULT 250,
                fat_goal REAL DEFAULT 70,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()

_ensure_nutrition_goals_table()


def obtener_metas_nutricion(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT ng.cal_goal, ng.prot_goal, ng.carb_goal, ng.fat_goal
            FROM nutrition_goals ng
            JOIN users u ON u.id = ng.user_id
            WHERE LOWER(u.name) = LOWER(?)
        """, (perfil,))
        row = cur.fetchone()
        if row:
            return dict(row)
        return {"cal_goal": 2200, "prot_goal": 150, "carb_goal": 250, "fat_goal": 70}


def guardar_metas_nutricion(perfil: str, cal: float, prot: float, carb: float, fat: float):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        if not user:
            return
        uid = user["id"]
        cur.execute("""
            INSERT INTO nutrition_goals (user_id, cal_goal, prot_goal, carb_goal, fat_goal)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                cal_goal=excluded.cal_goal, prot_goal=excluded.prot_goal,
                carb_goal=excluded.carb_goal, fat_goal=excluded.fat_goal,
                updated_at=CURRENT_TIMESTAMP
        """, (uid, cal, prot, carb, fat))
        conn.commit()


# ── WATER TRACKING ──
def _ensure_water_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS water_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                glasses INTEGER DEFAULT 0,
                date TEXT NOT NULL,
                UNIQUE(user_id, date),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()

_ensure_water_table()


def obtener_agua_hoy(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT w.glasses FROM water_log w
            JOIN users u ON u.id = w.user_id
            WHERE LOWER(u.name) = LOWER(?) AND w.date = ?
        """, (perfil, _today()))
        row = cur.fetchone()
        return row["glasses"] if row else 0


def agregar_agua(perfil: str, glasses: int = 1):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        if not user:
            return 0
        uid = user["id"]
        cur.execute("""
            INSERT INTO water_log (user_id, glasses, date)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET glasses = glasses + ?
        """, (uid, glasses, _today(), glasses))
        conn.commit()
        cur.execute("SELECT glasses FROM water_log WHERE user_id = ? AND date = ?", (uid, _today()))
        return cur.fetchone()["glasses"]


def resetear_agua(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE water_log SET glasses = 0
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND date = ?
        """, (perfil, _today()))
        conn.commit()
        return 0


# ── NUTRITION HISTORY (weekly) ──
def obtener_historial_nutricion(perfil: str, dias: int = 7):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT date(timestamp) as fecha,
                   SUM(val1) as calorias,
                   SUM(val2) as proteinas,
                   SUM(val3) as carbos,
                   SUM(val4) as grasas,
                   COUNT(*) as comidas
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'Nutricion'
            AND timestamp >= date('now', ?)
            GROUP BY date(timestamp)
            ORDER BY fecha
        """, (perfil, f"-{dias} days"))
        return [dict(r) for r in cur.fetchall()]


# ── ALIMENTOS CACHE (Normalized to 100g/100ml) ──
def _ensure_alimentos_cache_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alimentos_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT NULL,
                nombre TEXT NOT NULL,
                marca TEXT DEFAULT '',
                porcion_desc TEXT DEFAULT '100g',
                cal_100 REAL DEFAULT 0,
                prot_100 REAL DEFAULT 0,
                carb_100 REAL DEFAULT 0,
                fat_100 REAL DEFAULT 0,
                fibra_100 REAL DEFAULT 0,
                source TEXT DEFAULT 'manual',
                barcode TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_alimentos_nombre
            ON alimentos_cache(nombre COLLATE NOCASE)
        """)
        conn.commit()

_ensure_alimentos_cache_table()


def buscar_alimentos_cache(perfil: str, query: str, limit: int = 15):
    """Search cache: global (user_id IS NULL) + user's private entries only."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        uid = user["id"] if user else -1

        cur.execute("""
            SELECT * FROM alimentos_cache
            WHERE (user_id IS NULL OR user_id = ?)
            AND (nombre LIKE ? OR marca LIKE ?)
            ORDER BY
                CASE WHEN nombre LIKE ? THEN 0 ELSE 1 END,
                nombre
            LIMIT ?
        """, (uid, f"%{query}%", f"%{query}%", f"{query}%", limit))
        return [dict(r) for r in cur.fetchall()]


def guardar_alimento_cache(
    perfil: str, nombre: str, marca: str,
    cal_100: float, prot_100: float, carb_100: float, fat_100: float,
    fibra_100: float = 0, source: str = "manual", barcode: str = "",
    global_entry: bool = False
):
    """Save a food to cache. global_entry=True -> user_id=NULL (admin only)."""
    with get_conn() as conn:
        cur = conn.cursor()
        uid = None
        if not global_entry:
            cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
            user = cur.fetchone()
            uid = user["id"] if user else 1

        cur.execute("""
            INSERT INTO alimentos_cache
            (user_id, nombre, marca, cal_100, prot_100, carb_100, fat_100, fibra_100, source, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (uid, nombre, marca, round(cal_100, 1), round(prot_100, 1),
              round(carb_100, 1), round(fat_100, 1), round(fibra_100, 1), source, barcode))
        conn.commit()
        return cur.lastrowid


def obtener_alimento_por_id(perfil: str, alimento_id: int):
    """Get food by ID, respecting ownership (global or own)."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        uid = user["id"] if user else -1

        cur.execute("""
            SELECT * FROM alimentos_cache
            WHERE id = ? AND (user_id IS NULL OR user_id = ?)
        """, (alimento_id, uid))
        row = cur.fetchone()
        return dict(row) if row else None
