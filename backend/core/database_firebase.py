# backend/core/database_firebase.py
import firebase_admin
from firebase_admin import credentials, firestore
import os
import datetime
import json

# Configuración de Firebase
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_key_json = os.getenv("FIREBASE_KEY_JSON")
    if firebase_key_json:
        # Modo Producción (Render/Vercel)
        print("[FIREBASE] Cargando llave desde variable de entorno.")
        try:
            key_dict = json.loads(firebase_key_json)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"[FIREBASE ERROR] Error parseando FIREBASE_KEY_JSON: {e}")
    elif os.path.exists(KEY_PATH):
        # Modo Local
        print(f"[FIREBASE] Cargando llave desde archivo: {KEY_PATH}")
        cred = credentials.Certificate(KEY_PATH)
        firebase_admin.initialize_app(cred)
    else:
        print("[FIREBASE WARNING] No se encontró serviceAccountKey.json ni FIREBASE_KEY_JSON.")

db = firestore.client()

def _now():
    return datetime.datetime.now().isoformat()

def _today():
    return datetime.datetime.now().strftime("%Y-%m-%d")

# --- PERFILES ---
def obtener_perfil(nombre: str):
    doc_ref = db.collection("usuarios").document(nombre.lower())
    doc = doc_ref.get()
    if doc.exists:
        res = doc.to_dict()
        res["name"] = res.get("name", nombre)
        # Re-mapear para compatibilidad con el resto de la app
        res["descripcion"] = f"Meta: {res.get('goal') or res.get('objetivo_ia')}. Peso: {res.get('weight') or res.get('peso')}kg."
        res["objetivo_ia"] = res.get('goal') or res.get('objetivo_ia')
        res["memoria_viva"] = res.get('memoria_viva', 'Sin contexto generado aún.')
        return res
    return None

def obtener_memoria_perfil(nombre: str):
    perfil = obtener_perfil(nombre)
    if perfil:
        return {"contexto_narrativo": perfil.get("memoria_viva", "Sin contexto generado aún.")}
    return {"contexto_narrativo": "Sin contexto generado aún."}

def guardar_perfil(nombre: str, data: dict):
    doc_ref = db.collection("usuarios").document(nombre.lower())
    
    # Normalizar datos
    weight = data.get("peso", data.get("weight", 0))
    goal = data.get("objetivo_ia", data.get("goal", ""))
    email = data.get("email", f"{nombre}@vortice.local")
    password = data.get("password", "123456")
    memoria = data.get("memoria_viva", data.get("descripcion", ""))

    payload = {
        "name": nombre,
        "email": email,
        "weight": weight,
        "goal": goal,
        "password": password,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    if "memoria_viva" in data:
        payload["memoria_viva"] = data["memoria_viva"]

    doc_ref.set(payload, merge=True)

def listar_perfiles():
    docs = db.collection("usuarios").stream()
    return {doc.id: {"id": doc.id} for doc in docs}

# --- CHAT / MENSAJES ---
def guardar_mensaje(perfil: str, rol: str, contenido: str):
    log_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad").document()
    log_ref.set({
        "type": "Chat",
        "description": f"{rol}: {contenido}",
        "timestamp": firestore.SERVER_TIMESTAMP,
        "rol": rol,
        "contenido": contenido
    })

def obtener_historial_chat(perfil: str, limite: int = 20):
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    query = logs_ref.where("type", "==", "Chat").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limite)
    docs = query.stream()
    
    hist = []
    for doc in docs:
        d = doc.to_dict()
        desc = d.get("description", "")
        parts = desc.split(": ", 1)
        if len(parts) == 2:
            hist.append({"rol": parts[0], "contenido": parts[1]})
        else:
            hist.append({"rol": d.get("rol", "unknown"), "contenido": d.get("contenido", desc)})
    
    return hist[::-1] # Invertir para orden cronológico

# --- NUTRICION / EVENTOS ---
def guardar_evento(perfil: str, tipo: str, desc: str, humor: str, cal: float, prot: float=0, carb: float=0, gras: float=0):
    log_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad").document()
    log_ref.set({
        "type": tipo,
        "description": desc,
        "humor": humor,
        "val1": cal,
        "val2": prot,
        "val3": carb,
        "val4": gras,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

def obtener_comidas_hoy(perfil: str):
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    
    # Firestore no permite date(timestamp) fácilmente sin índices compuestos, 
    # así que filtramos por rango de tiempo para hoy.
    today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = logs_ref.where("type", "==", "Nutricion").where("timestamp", ">=", today_start).order_by("timestamp", direction=firestore.Query.DESCENDING)
    docs = query.stream()
    
    return [{
        "id": doc.id,
        "timestamp": doc.to_dict().get("timestamp"),
        "descripcion": doc.to_dict().get("description"),
        "calorias": doc.to_dict().get("val1", 0),
        "proteinas": doc.to_dict().get("val2", 0),
        "carbos": doc.to_dict().get("val3", 0),
        "grasas": doc.to_dict().get("val4", 0)
    } for doc in docs]

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
    rutina_ref = db.collection("usuarios").document(perfil.lower()).collection("rutinas").document()
    rutina_ref.set({
        "name": nombre,
        "description": descripcion,
        "ejercicios": ejercicios,
        "created_at": firestore.SERVER_TIMESTAMP
    })

def obtener_rutinas(perfil: str):
    rutinas_ref = db.collection("usuarios").document(perfil.lower()).collection("rutinas")
    docs = rutinas_ref.order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    
    rutinas = []
    for doc in docs:
        d = doc.to_dict()
        rutinas.append({
            "id": doc.id,
            "nombre": d.get("name"),
            "descripcion": d.get("description"),
            "ejercicios": d.get("ejercicios", []),
            "fecha": d.get("created_at")
        })
    return rutinas

def borrar_historial_chat(perfil: str):
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    chat_logs = logs_ref.where("type", "==", "Chat").stream()
    for doc in chat_logs:
        doc.reference.delete()

def guardar_log_set(perfil: str, id_ejercicio: str, set_num: int, peso: float, reps: int, target: str=""):
    log_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad").document()
    log_ref.set({
        "type": "GymSet",
        "description": f"Set {set_num} de {id_ejercicio}",
        "val1": peso, # Peso
        "val2": reps, # Reps
        "ref_id": id_ejercicio,
        "target_musculo": target,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

def obtener_ultimo_peso(perfil: str, id_ejercicio: str):
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    query = logs_ref.where("type", "==", "GymSet").where("ref_id", "==", id_ejercicio).order_by("timestamp", direction=firestore.Query.DESCENDING).limit(1)
    docs = query.stream()
    for doc in docs:
        return doc.to_dict().get("val1")
    return None

def obtener_alacena(perfil: str):
    pantry_ref = db.collection("usuarios").document(perfil.lower()).collection("pantry")
    docs = pantry_ref.stream()
    return [{**doc.to_dict(), "id": doc.id, "ingrediente": doc.to_dict().get("ingredient"), "cantidad": doc.to_dict().get("amount"), "calorias": doc.to_dict().get("calories")} for doc in docs]

def guardar_en_alacena(perfil: str, ingrediente: str, cantidad: str, calorias: float=0):
    pantry_ref = db.collection("usuarios").document(perfil.lower()).collection("pantry").document()
    pantry_ref.set({
        "ingredient": ingrediente,
        "amount": cantidad,
        "calories": calorias,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

def eliminar_de_alacena_perfil(perfil: str, item_id: str):
    db.collection("usuarios").document(perfil.lower()).collection("pantry").document(item_id).delete()

def obtener_entrenamientos_resumen(perfil: str, dias: int):
    # Esta función en SQLite agrupa por fecha. En Firestore es más complejo sin índices.
    # Por ahora, devolvemos los datos crudos o una aproximación.
    since = datetime.datetime.now() - datetime.timedelta(days=dias)
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    query = logs_ref.where("type", "==", "GymSet").where("timestamp", ">=", since).order_by("timestamp", direction=firestore.Query.DESCENDING)
    docs = query.stream()
    
    # Agrupar por fecha en Python
    resumen = {}
    for doc in docs:
        d = doc.to_dict()
        ts = d.get("timestamp")
        if not ts: continue
        fecha = ts.strftime("%Y-%m-%d")
        if fecha not in resumen:
            resumen[fecha] = {"fecha": fecha, "series": 0, "volumen": 0}
        resumen[fecha]["series"] += 1
        resumen[fecha]["volumen"] += (d.get("val1", 0) * d.get("val2", 0))
    
    return sorted(list(resumen.values()), key=lambda x: x["fecha"])

def obtener_eventos_timeline(perfil: str, limit: int):
    logs_ref = db.collection("usuarios").document(perfil.lower()).collection("actividad")
    docs = logs_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

def obtener_ayuno(perfil: str):
    doc_ref = db.collection("usuarios").document(perfil.lower()).collection("habitos").document("ayuno")
    doc = doc_ref.get()
    return doc.to_dict() if doc.exists else {}

def actualizar_ayuno(perfil: str, en_ayuno: bool, inicio_iso: str, meta_horas: float):
    doc_ref = db.collection("usuarios").document(perfil.lower()).collection("habitos").document("ayuno")
    doc_ref.set({
        "start_time": inicio_iso,
        "hours_goal": meta_horas,
        "is_active": 1 if en_ayuno else 0,
        "updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)

def eliminar_rutina_perfil(perfil: str, rutina_id: str):
    db.collection("usuarios").document(perfil.lower()).collection("rutinas").document(rutina_id).delete()

def eliminar_evento_perfil(perfil: str, evento_id: str):
    db.collection("usuarios").document(perfil.lower()).collection("actividad").document(evento_id).delete()

def consultar_datos(tabla: str, perfil: str): 
    if tabla == "alacena": return obtener_alacena(perfil)
    if tabla == "entrenamientos": return obtener_entrenamientos_resumen(perfil, 30)
    return []
