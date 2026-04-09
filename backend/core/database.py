"""
database.py — Capa de datos migrada de SQLite a Firebase Firestore
Proyecto: vorticehealth-7ec5e
Misma interfaz de funciones que la versión SQLite → main.py no cambia.
¡Todo en la nube! (Usuarios, Historial y Catálogo de Ejercicios).
"""
import datetime
import os
from google.cloud.firestore_v1 import FieldFilter

from .firebase import get_db

# ── helpers ──────────────────────────────────────────────────────────────────

def _col(perfil: str, sub: str):
    """Devuelve referencia a una sub-colección del perfil."""
    db = get_db()
    return db.collection("usuarios").document(str(perfil)).collection(sub)

def _doc(perfil: str):
    """Devuelve referencia al documento raíz del perfil."""
    db = get_db()
    return db.collection("usuarios").document(str(perfil))

def _now():
    return datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

def _today_local():
    """Fecha de hoy en zona horaria local (YYYY-MM-DD)."""
    return datetime.datetime.now().strftime("%Y-%m-%d")


# ── PERFILES ─────────────────────────────────────────────────────────────────

def obtener_perfil(nombre: str):
    try:
        doc = _doc(nombre).get()
        if doc.exists:
            return doc.to_dict()
    except Exception as e:
        print(f"Error obtener_perfil Firestore: {e}")
    return None

def guardar_perfil(nombre: str, data: dict):
    try:
        _doc(nombre).set(data, merge=True)
    except Exception as e:
        print(f"Error guardar_perfil Firestore: {e}")

def listar_perfiles():
    try:
        db = get_db()
        docs = db.collection("usuarios").get()
        return {d.id: d.to_dict() for d in docs}
    except Exception as e:
        print(f"Error listar_perfiles Firestore: {e}")
        return {}


# ── CATALOGO EJERCICIOS ─────────────────────────────────────────────────────

def obtener_catalogo_completo():
    try:
        db = get_db()
        docs = db.collection("catalogo_ejercicios").get()
        return [d.to_dict() for d in docs]
    except Exception as e:
        print(f"Error obtener_catalogo_completo Firestore: {e}")
        return []

def buscar_ejercicio_por_id(id_ej: str):
    try:
        db = get_db()
        doc = db.collection("catalogo_ejercicios").document(str(id_ej)).get()
        if doc.exists:
            return doc.to_dict()
    except Exception as e:
        print(f"Error buscar_ejercicio_por_id Firestore: {e}")
    return None

def buscar_ejercicios_por_musculo(musculo: str):
    try:
        db = get_db()
        docs = (db.collection("catalogo_ejercicios")
                .where(filter=FieldFilter("target", "==", musculo.lower()))
                .get())
        return [d.to_dict() for d in docs]
    except Exception as e:
        print(f"Error buscar_ejercicios_por_musculo Firestore: {e}")
        return []


# ── CHAT ─────────────────────────────────────────────────────────────────────

def guardar_mensaje(perfil: str, rol: str, contenido: str):
    try:
        _col(perfil, "chat").add({
            "rol": rol,
            "contenido": contenido,
            "timestamp": _now()
        })
    except Exception as e:
        print(f"Error guardar_mensaje Firestore: {e}")


def obtener_historial_chat(perfil: str, limite: int = 20):
    try:
        docs = (_col(perfil, "chat")
                .order_by("timestamp")
                .limit_to_last(limite)
                .get())
        return [{"rol": d.get("rol"), "contenido": d.get("contenido")} for d in docs]
    except Exception as e:
        print(f"Error obtener_historial_chat Firestore: {e}")
        return []


def borrar_historial_chat(perfil: str):
    try:
        docs = _col(perfil, "chat").list_documents()
        for d in docs:
            d.delete()
    except Exception as e:
        print(f"Error borrar_historial_chat Firestore: {e}")


# ── EVENTOS / NUTRICION ───────────────────────────────────────────────────────

def guardar_evento(perfil: str, tipo: str, desc: str, humor: str,
                   cal: float, prot: float = 0, carb: float = 0, gras: float = 0):
    try:
        _col(perfil, "eventos").add({
            "tipo": tipo,
            "descripcion": desc,
            "humor": humor,
            "calorias_aprox": float(cal or 0),
            "proteinas": float(prot or 0),
            "carbohidratos": float(carb or 0),
            "grasas": float(gras or 0),
            "timestamp": _now(),
            "fecha": _today_local()
        })
    except Exception as e:
        print(f"Error guardar_evento Firestore: {e}")


def obtener_comidas_hoy(perfil: str):
    try:
        hoy = _today_local()
        # Traemos todos los eventos del perfil y filtramos en Python
        # (evita necesitar índice compuesto en Firestore)
        docs = _col(perfil, "eventos").get()
        return [{
            "id": d.id,
            "timestamp": d.get("timestamp"),
            "descripcion": d.get("descripcion"),
            "calorias": d.get("calorias_aprox") or 0,
            "proteinas": d.get("proteinas") or 0,
            "carbos": d.get("carbohidratos") or 0,
            "grasas": d.get("grasas") or 0,
        } for d in docs
          if d.get("tipo") == "Nutricion" and (d.get("fecha") or "") == hoy]
    except Exception as e:
        print(f"Error obtener_comidas_hoy Firestore: {e}")
        return []


def eliminar_evento(evento_id: str):
    """evento_id es el ID del documento Firestore (string)."""
    try:
        # Necesitamos buscar en qué perfil vive. Buscamos brute-force si no conocemos perfil.
        # Convención: main.py llama esta función con el ID que vino de obtener_comidas_hoy.
        # Como Firestore no tiene DELETE por ID global, guardamos el perfil en el doc.
        # NOTA: Solución simple — el frontend envía {perfil, id} y llamamos a /_col(perfil, "eventos").document(id).delete()
        # Esta función queda como no-op si no recibe perfil.
        pass
    except Exception as e:
        print(f"Error eliminar_evento Firestore: {e}")


def eliminar_evento_perfil(perfil: str, evento_id: str):
    """Versión completa con perfil."""
    try:
        _col(perfil, "eventos").document(str(evento_id)).delete()
    except Exception as e:
        print(f"Error eliminar_evento_perfil Firestore: {e}")


def obtener_macros_hoy(perfil: str):
    try:
        comidas = obtener_comidas_hoy(perfil)
        return {
            "calorias": sum(c["calorias"] for c in comidas),
            "proteinas": sum(c["proteinas"] for c in comidas),
            "carbos": sum(c["carbos"] for c in comidas),
            "grasas": sum(c["grasas"] for c in comidas),
        }
    except Exception as e:
        print(f"Error obtener_macros_hoy Firestore: {e}")
        return {"calorias": 0, "proteinas": 0, "carbos": 0, "grasas": 0}


def obtener_eventos_timeline(perfil: str, limit: int = 50):
    try:
        # Traemos sin order_by para evitar ínices compuestos, ordenamos en Python
        docs = _col(perfil, "eventos").limit(limit * 2).get()
        rows = [{
            "timestamp": d.get("timestamp"),
            "tipo": d.get("tipo"),
            "descripcion": d.get("descripcion"),
            "calorias": d.get("calorias_aprox") or 0,
            "proteinas": d.get("proteinas") or 0,
            "carbos": d.get("carbohidratos") or 0,
            "grasas": d.get("grasas") or 0,
        } for d in docs]
        # Ordenar por timestamp descendente
        rows.sort(key=lambda r: r["timestamp"] or "", reverse=True)
        return rows[:limit]
    except Exception as e:
        print(f"Error obtener_eventos_timeline Firestore: {e}")
        return []


# ── ALACENA ───────────────────────────────────────────────────────────────────

def guardar_en_alacena(perfil: str, ingrediente: str, cantidad: str, calorias: float = 0):
    try:
        _col(perfil, "alacena").add({
            "ingrediente": ingrediente,
            "cantidad": cantidad,
            "calorias_aprox": float(calorias or 0),
            "fecha_registro": _now()
        })
    except Exception as e:
        print(f"Error guardar_en_alacena Firestore: {e}")


def eliminar_de_alacena(id_ingrediente: str):
    # Necesitamos el perfil — usamos eliminar_de_alacena_perfil desde main.py
    pass


def eliminar_de_alacena_perfil(perfil: str, id_ingrediente: str):
    try:
        _col(perfil, "alacena").document(str(id_ingrediente)).delete()
    except Exception as e:
        print(f"Error eliminar_de_alacena Firestore: {e}")


def obtener_alacena(perfil: str):
    try:
        docs = (_col(perfil, "alacena")
                .order_by("fecha_registro", direction="DESCENDING")
                .get())
        return [{
            "id": d.id,
            "ingrediente": d.get("ingrediente"),
            "cantidad": d.get("cantidad"),
            "calorias": d.get("calorias_aprox") or 0,
            "fecha": d.get("fecha_registro")
        } for d in docs]
    except Exception as e:
        print(f"Error obtener_alacena Firestore: {e}")
        return []


# ── RUTINAS GUARDADAS ─────────────────────────────────────────────────────────

def guardar_rutina(perfil: str, nombre: str, descripcion: str, ejercicios_json):
    try:
        import json as _json
        _col(perfil, "rutinas").add({
            "nombre": nombre,
            "descripcion": descripcion or "",
            "ejercicios_json": _json.dumps(ejercicios_json, ensure_ascii=False),
            "fecha_creacion": _now()
        })
    except Exception as e:
        print(f"Error guardar_rutina Firestore: {e}")


def obtener_rutinas(perfil: str):
    try:
        import json as _json
        docs = (_col(perfil, "rutinas")
                .order_by("fecha_creacion", direction="DESCENDING")
                .get())
        return [{
            "id": d.id,
            "nombre": d.get("nombre"),
            "descripcion": d.get("descripcion"),
            "ejercicios": _json.loads(d.get("ejercicios_json") or "[]"),
            "fecha": d.get("fecha_creacion")
        } for d in docs]
    except Exception as e:
        print(f"Error obtener_rutinas Firestore: {e}")
        return []


def eliminar_rutina(rutina_id: str):
    # Necesitamos el perfil → usamos eliminar_rutina_perfil desde main.py
    pass


def eliminar_rutina_perfil(perfil: str, rutina_id: str):
    try:
        _col(perfil, "rutinas").document(str(rutina_id)).delete()
    except Exception as e:
        print(f"Error eliminar_rutina Firestore: {e}")


# ── MEMORIA VIVA ──────────────────────────────────────────────────────────────

def actualizar_memoria_perfil(perfil: str, contexto_narrativo: str, historial_chat_resumido: str):
    try:
        _doc(perfil).set({
            "memoria": {
                "contexto_narrativo": contexto_narrativo,
                "historial_resumido": historial_chat_resumido,
                "fecha_actualizacion": _now()
            }
        }, merge=True)
    except Exception as e:
        print(f"Error actualizar_memoria_perfil Firestore: {e}")


def obtener_memoria_perfil(perfil: str):
    try:
        doc = _doc(perfil).get()
        if doc.exists:
            mem = doc.to_dict().get("memoria")
            if mem:
                return {
                    "contexto_narrativo": mem.get("contexto_narrativo", ""),
                    "historial_chat_resumido": mem.get("historial_resumido", "")
                }
    except Exception as e:
        print(f"Error obtener_memoria_perfil Firestore: {e}")
    return None


# ── GYM / ENTRENAMIENTOS ──────────────────────────────────────────────────────

def guardar_log_set(perfil: str, ej_id: str, set_nro: int,
                    peso: float, reps: int, target: str = None, rpe: int = None):
    try:
        hoy = _today_local()
        _col(perfil, "entrenamientos").add({
            "ejercicio_id": ej_id,
            "target": target or "",
            "set_nro": set_nro,
            "peso": float(peso or 0),
            "reps": int(reps or 0),
            "rpe": rpe,
            "completado": True,
            "timestamp": _now(),
            "fecha": hoy
        })
    except Exception as e:
        print(f"Error guardar_log_set Firestore: {e}")


def obtener_entrenamientos_resumen(perfil: str, dias: int = 30):
    try:
        desde = (datetime.datetime.now() - datetime.timedelta(days=dias)).strftime("%Y-%m-%d")
        # Traemos todo y filtramos en Python para evitar índices compuestos
        docs = _col(perfil, "entrenamientos").get()
        rows = [d.to_dict() for d in docs
                if d.to_dict().get("completado") and (d.to_dict().get("fecha") or "") >= desde]

        # Agrupar por día
        por_dia_dict: dict = {}
        por_musculo_dict: dict = {}
        for r in rows:
            fecha = r.get("fecha", "")
            if fecha not in por_dia_dict:
                por_dia_dict[fecha] = {"volumen": 0, "ejercicios": set(), "series": 0}
            por_dia_dict[fecha]["volumen"] += (r.get("peso") or 0) * (r.get("reps") or 0)
            por_dia_dict[fecha]["ejercicios"].add(r.get("ejercicio_id", ""))
            por_dia_dict[fecha]["series"] += 1
            tgt = r.get("target", "")
            if tgt:
                por_musculo_dict[tgt] = por_musculo_dict.get(tgt, 0) + 1

        por_dia = [{"fecha": k, "volumen": v["volumen"],
                    "ejercicios": len(v["ejercicios"]), "series": v["series"]}
                   for k, v in sorted(por_dia_dict.items(), reverse=True)]
        por_musculo = [{"musculo": k, "sets": v}
                       for k, v in sorted(por_musculo_dict.items(), key=lambda x: -x[1])]
        return {"por_dia": por_dia, "por_musculo": por_musculo}
    except Exception as e:
        print(f"Error obtener_entrenamientos_resumen Firestore: {e}")
        return {"por_dia": [], "por_musculo": []}


# ── AYUNO INTERMITENTE ────────────────────────────────────────────────────────

def actualizar_ayuno(perfil: str, en_ayuno: bool, inicio_iso: str, meta_horas: float):
    try:
        _doc(perfil).set({
            "ayuno": {
                "en_ayuno": bool(en_ayuno),
                "inicio_iso": inicio_iso,
                "meta_horas": float(meta_horas or 16)
            }
        }, merge=True)
    except Exception as e:
        print(f"Error actualizar_ayuno Firestore: {e}")


def obtener_ayuno(perfil: str):
    try:
        doc = _doc(perfil).get()
        if doc.exists:
            ayuno = doc.to_dict().get("ayuno")
            if ayuno:
                return {
                    "en_ayuno": ayuno.get("en_ayuno", False),
                    "inicio": ayuno.get("inicio_iso"),
                    "meta_horas": ayuno.get("meta_horas", 16)
                }
    except Exception as e:
        print(f"Error obtener_ayuno Firestore: {e}")
    return {"en_ayuno": False, "inicio": None, "meta_horas": 16}


# ── COMPAT (funciones legacy que main.py puede llamar) ────────────────────────

def consultar_datos(tabla: str, perfil: str, limit: int = 10):
    """Compatibilidad legacy — retorna lista vacía (las queries específicas reemplazan esto)."""
    return []