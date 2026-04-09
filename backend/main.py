from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sys
import os
import json
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import (
    obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
    consultar_datos, guardar_log_set, guardar_evento,
    obtener_alacena, guardar_en_alacena, eliminar_de_alacena_perfil,
    obtener_entrenamientos_resumen, obtener_eventos_timeline, obtener_macros_hoy,
    obtener_ayuno, actualizar_ayuno,
    guardar_rutina, obtener_rutinas, eliminar_rutina_perfil,
    obtener_comidas_hoy, eliminar_evento_perfil,
    obtener_perfil, guardar_perfil, listar_perfiles,
    buscar_ejercicio_por_id, obtener_catalogo_completo
)
from core.ai import (
    consultar_ollama, clasificar_intencion, generar_rutina_inteligente,
    estimar_nutricion_ollama, analizar_imagen_ollama, generar_receta_alacena,
    fix_gif_url
)
from personality.prompt_builder import build_system_prompt
from personality.motor_memoria import generar_y_guardar_contexto
from core.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm

async def lifespan(app: FastAPI):
    # Acciones al iniciar
    print("[VORTICE] Iniciando Vórtice Health API (Cloud Mode)")
    yield
    # Acciones al cerrar (si hubiera)

app = FastAPI(
    title="Vórtice Health API", 
    description="API para la app Vórtice Health Coach",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Vórtice Health API is running - VERSION 1.1"}


# ============================================================
# AUTENTICACIÓN Y ONBOARDING
# ============================================================

class RegisterRequest(BaseModel):
    nombre: str
    password: str
    edad: int
    peso: float
    meta: str
    deporte: str

@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    data = {
        "descripcion": f"Edad: {req.edad}, Peso: {req.peso}kg. Meta principal: {req.meta}. Deporte: {req.deporte}",
        "detalle": "Onboarding completado",
        "objetivo_ia": req.meta,
        "password": req.password 
    }
    guardar_perfil(req.nombre, data)
    access_token = create_access_token(data={"sub": req.nombre})
    return {"access_token": access_token, "token_type": "bearer", "status": "success"}

@app.post("/api/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Intentamos encontrar el usuario tal cual, o con la primera letra capitalizada, o todo minúscula
    nombres_a_probar = [form_data.username, form_data.username.capitalize(), form_data.username.lower()]
    user = None
    final_username = form_data.username
    
    for nombre in nombres_a_probar:
        user = obtener_perfil(nombre)
        if user:
            final_username = nombre
            break

    if not user or user.get("password", "123456") != form_data.password:
        return {"error": "Credenciales inválidas"}
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": final_username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "status": "success"}

# ============================================================
# PERFILES
# ============================================================

@app.get("/api/perfiles")
def get_perfiles_endpoint():
    return listar_perfiles()

@app.get("/api/debug/usuarios")
def debug_usuarios():
    # Para saber exactamente qué hay guardado en cada perfil
    try:
        from core.firebase import get_db
        db = get_db()
        docs = db.collection("usuarios").stream()
        return {d.id: d.to_dict() for d in docs}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/delete/{nombre}")
def debug_delete_user(nombre: str):
    try:
        from core.firebase import get_db
        db = get_db()
        db.collection("usuarios").document(nombre).delete()
        return {"status": "success", "message": f"Perfil {nombre} eliminado correctamente"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/api/perfil/{nombre}")
def get_perfil_endpoint(nombre: str):
    perfil = obtener_perfil(nombre)
    if perfil:
        memoria = obtener_memoria_perfil(nombre)
        perfil["memoria_viva"] = memoria["contexto_narrativo"] if memoria else "Sin contexto generado aún."
        return {"status": "success", "perfil": perfil, "nombre": nombre}
    return {"status": "error", "error": "Perfil no encontrado"}

class PerfilUpdate(BaseModel):
    descripcion: str
    detalle: str
    objetivo_ia: str

@app.put("/api/perfil/{nombre}")
def update_perfil_endpoint(nombre: str, data: PerfilUpdate):
    try:
        guardar_perfil(nombre, data.dict())
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ============================================================
# CHAT INTELIGENTE (Feature Estrella ⭐)
# ============================================================

class ChatRequest(BaseModel):
    perfil: str
    mensaje: str

@app.post("/api/chat")
def send_chat(req: ChatRequest):
    try:
        # Cargar perfiles desde Firestore
        perfil_info = obtener_perfil(req.perfil) or {}

        # 1. Recuperar contexto de corto plazo (últimos 5)
        historial_dicts = obtener_historial_chat(req.perfil, limite=5)
        hist_txt = "\n".join([f"{h['rol']}: {h['contenido']}" for h in historial_dicts])
        
        # 2. Recuperar Memoria Semántica (RAG)
        from core.memoria_vectorial import buscar_memoria_semantica, guardar_chat_vectorial
        contexto_rag = buscar_memoria_semantica(req.perfil, req.mensaje, limit=3)

        # 3. Guardar mensaje del usuario (SQLite + Vectorial)
        guardar_mensaje(req.perfil, "user", req.mensaje)
        guardar_chat_vectorial(req.perfil, "user", req.mensaje)

        # 4. LLAMADA UNIFICADA AL CEREBRO VÓRTICE (Una sola llamada a Gemini)
        from core.ai import cerebro_vortice_unificado
        resultado = cerebro_vortice_unificado(
            mensaje=req.mensaje,
            perfil_info=perfil_info.get("descripcion", ""),
            historial_previo=hist_txt,
            contexto_vectorial=contexto_rag
        )
        
        tipo = resultado.get("tipo", "chat_normal")
        respuesta_ia = resultado.get("respuesta", "Entendido, Gonzalo.")
        
        rutina_gen = None
        nutricion_det = None

        # 5. Actuar según la detección automática del Cerebro
        if tipo == "nutricion" and resultado.get("nutricion"):
            n = resultado["nutricion"]
            nutricion_det = n
            guardar_evento(req.perfil, "Nutricion", n.get('alimento','Comida'), "Auto", n.get('cal',0), n.get('prot',0), n.get('carb',0), n.get('gras',0))
        
        elif (tipo == "rutina" or tipo == "gym") and (resultado.get("rutina") or resultado.get("ejercicios")):
            raw_rutina = resultado.get("rutina") or resultado.get("ejercicios", [])
            rutina_gen = []
            
            # Intentar buscar info completa en el catálogo para cada ID sugerido por la IA
            for r in raw_rutina:
                eid = r.get("id") or r.get("id_ejercicio")
                if not eid: continue
                
                row = buscar_ejercicio_por_id(eid)
                if row:
                    rutina_gen.append({
                        "id_ejercicio": row.get('id_ejercicio'),
                        "nombre_es": row.get('nombre_es'),
                        "target": row.get('target'),
                        "body_part": UI_MUSCULO_ES.get(row.get('target','').lower(), row.get('target','').capitalize() or "General"),
                        "gif_url": fix_gif_url(row.get('gif_url')),
                        "sets": r.get("sets") or [{"reps": "12", "kg": "", "done": False} for _ in range(r.get("series", 3))]
                    })
            
        elif tipo == "alacena":
            guardar_en_alacena(req.perfil, resultado.get("datos_extra", req.mensaje), "")
            
        # 6. Guardar y Responder
        guardar_mensaje(req.perfil, "assistant", respuesta_ia)
        guardar_chat_vectorial(req.perfil, "assistant", respuesta_ia)
        
        return {
            "status": "success", 
            "respuesta": respuesta_ia, 
            "tipo_intencion": tipo,
            "rutina_generada": rutina_gen,
            "nutricion_detectada": nutricion_det,
            "datos_extra": resultado.get("datos_extra", "")
        }


    except Exception as e:
        import traceback; traceback.print_exc()
        return {"status": "error", "error": str(e)}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


from core.langchain_coach import chatear_con_langchain
from core.memoria_vectorial import guardar_chat_vectorial, buscar_memoria_semantica

def _chat_normal(req: ChatRequest, perfil_info: dict):
    """Flujo de chat normal con memoria viva (SQLite) y profunda (ChromaDB) vía LangChain."""
    
    # 1. Recuperar contexto de corto plazo (SQLite)
    historial_dicts = obtener_historial_chat(req.perfil, limite=5)
    
    # 2. Recuperar contexto narrativo (SQLite)
    contexto_sqlite = build_system_prompt(req.perfil, perfil_info, consultar_datos("eventos", req.perfil))
    
    # 3. Recuperar memoria semántica (ChromaDB - RAG)
    contexto_vectorial = buscar_memoria_semantica(req.perfil, req.mensaje, limit=3)
    
    # 4. Guardar mensaje del usuario en la memoria profunda
    guardar_chat_vectorial(req.perfil, "user", req.mensaje)
    
    # 5. Generar respuesta usando LangChain
    respuesta_ia = chatear_con_langchain(
        perfil_actual=req.perfil,
        ultima_pregunta=req.mensaje,
        contexto_sqlite=contexto_sqlite,
        contexto_vectorial=contexto_vectorial,
        ultimos_mensajes=[{"role": x["rol"], "content": x["contenido"]} for x in historial_dicts]
    )
    
    # 6. Guardar respuesta del asistente
    guardar_mensaje(req.perfil, "assistant", respuesta_ia)
    guardar_chat_vectorial(req.perfil, "assistant", respuesta_ia)
    
    return {"status": "success", "respuesta": respuesta_ia, "tipo_intencion": "chat_normal"}

@app.get("/api/chat/historial")
def get_chat_history(perfil: str):
    hist = obtener_historial_chat(perfil, limite=30)
    return {"historial": hist}

@app.delete("/api/chat/historial")
def delete_chat_history(perfil: str):
    borrar_historial_chat(perfil)
    guardar_evento(perfil, "Limpieza", "Se eliminó el historial de chat", "Neutro", 0)
    return {"status": "success"}



# ============================================================
# GYM / ENTRENAMIENTOS
# ============================================================

class SetLog(BaseModel):
    reps: str
    kg: str
    done: bool

class EjercicioEdit(BaseModel):
    id_ejercicio: str
    target: str
    sets: List[SetLog]

class RutinaSaveRequest(BaseModel):
    perfil: str
    rutina: List[EjercicioEdit]

@app.get("/api/ejercicios")
def get_ejercicios_endpoint():
    try:
        rows = obtener_catalogo_completo()
        return {"status": "success", "ejercicios": [{"id_ejercicio": r['id_ejercicio'], "nombre_es": r['nombre_es'], "nombre_en": r.get('nombre_en', ""), "body_part": r.get('body_part'), "target": r.get('target'), "gif_url": fix_gif_url(r.get('gif_url'))} for r in rows]}
    except Exception as e:
        return {"status": "error", "ejercicios": [], "error": str(e)}

@app.post("/api/gym/guardar")
def guardar_sesion(req: RutinaSaveRequest):
    try:
        ejercicios_completados = 0
        tot_kg = 0
        for ej in req.rutina:
            for i, s in enumerate(ej.sets):
                if s.done:
                    peso = float(s.kg) if s.kg else 0
                    reps = int(s.reps) if s.reps else 0
                    guardar_log_set(req.perfil, ej.id_ejercicio, i+1, peso, reps, target=ej.target)
                    ejercicios_completados += 1
                    tot_kg += peso * reps
        
        if ejercicios_completados > 0:
            guardar_evento(req.perfil, "Gym", f"Sesión terminada: {ejercicios_completados} series. Volumen total: {tot_kg:.0f}kg", "Sólido", 300)
            
        return {"status": "success", "series": ejercicios_completados, "volumen": tot_kg}
    except Exception as e:
        return {"status": "error", "error": str(e)}


class GymFeedbackRequest(BaseModel):
    perfil: str
    feedback: str
    rating: int = 0
    ejercicios: str = ""

@app.post("/api/gym/feedback")
def gym_feedback(req: GymFeedbackRequest):
    """Guarda el feedback del entrenamiento como memoria del agente."""
    try:
        # Guardar como evento de tipo Feedback
        guardar_evento(
            req.perfil, "Feedback_Gym",
            f"Rating: {req.rating}/5 | Ejercicios: {req.ejercicios} | Comentario: {req.feedback}",
            "Feedback", 0
        )
        # Registrar el feedback como mensaje del sistema en el historial para que la IA lo lea
        feedback_msg = f"[Sistema: El usuario acabó de entrenar ({req.ejercicios}) y dejó este feedback (rating {req.rating}/5): '{req.feedback}'. Tené esto en cuenta en la próxima conversación.]"
        guardar_mensaje(req.perfil, "system", feedback_msg)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ============================================================
# NUTRICIÓN
# ============================================================

class NutricionTextoRequest(BaseModel):
    perfil: str
    alimento: str

@app.post("/api/nutricion/analizar-texto")
def analizar_texto(req: NutricionTextoRequest):
    try:
        resultado = estimar_nutricion_ollama(req.alimento)
        if resultado:
            guardar_evento(
                req.perfil, "Nutricion", resultado["descripcion"], 
                "Manual", resultado["calorias"], resultado["proteinas"], 
                resultado["carbos"], resultado["grasas"]
            )
            return {"status": "success", "resultado": resultado}
        return {"status": "error", "error": "No se pudo analizar"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/nutricion/analizar-foto")
async def analizar_foto(perfil: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        resultado = analizar_imagen_ollama(contents)
        if resultado:
            guardar_evento(
                perfil, "Nutricion", f"{resultado['alimento']}: {resultado['descripcion']}", 
                "Foto", resultado["calorias"], resultado["proteinas"], 
                resultado["carbos"], resultado["grasas"]
            )
            return {"status": "success", "resultado": resultado}
        return {"status": "error", "error": "No se pudo analizar la imagen"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/api/nutricion/macros-hoy")
def macros_hoy(perfil: str):
    macros = obtener_macros_hoy(perfil)
    return {"status": "success", "macros": macros}

# ============================================================
# AYUNO INTERMITENTE
# ============================================================

class AyunoRequest(BaseModel):
    perfil: str
    en_ayuno: bool
    inicio_iso: Optional[str] = None
    meta_horas: float = 16

@app.get("/api/nutricion/ayuno")
def get_ayuno(perfil: str):
    datos = obtener_ayuno(perfil)
    return {"status": "success", "ayuno": datos}

@app.post("/api/nutricion/ayuno")
def set_ayuno(req: AyunoRequest):
    actualizar_ayuno(req.perfil, req.en_ayuno, req.inicio_iso, req.meta_horas)
    return {"status": "success"}

# ============================================================
# ALACENA
# ============================================================

class AlacenaRequest(BaseModel):
    perfil: str
    ingrediente: str
    cantidad: str = ""

@app.get("/api/alacena")
def get_alacena(perfil: str):
    items = obtener_alacena(perfil)
    return {"status": "success", "items": items}

@app.post("/api/alacena")
def add_alacena(req: AlacenaRequest):
    from core.ai import estimar_calorias_ingrediente
    cals = estimar_calorias_ingrediente(req.ingrediente)
    guardar_en_alacena(req.perfil, req.ingrediente, req.cantidad, calorias=cals)
    return {"status": "success", "calorias": cals}

@app.delete("/api/alacena/{item_id}")
def delete_alacena(item_id: str, perfil: str):
    eliminar_de_alacena_perfil(perfil, item_id)
    return {"status": "success"}

class AlacenaEditRequest(BaseModel):
    ingrediente: str

@app.put("/api/alacena/{item_id}")
def edit_alacena(item_id: str, req: AlacenaEditRequest, perfil: str = ""):
    try:
        from core.firebase import get_db
        db = get_db()
        if db and perfil:
            db.collection("usuarios").document(perfil).collection("alacena").document(item_id).update({"ingrediente": req.ingrediente})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


class RecetaRequest(BaseModel):
    perfil: str

@app.post("/api/alacena/receta")
def generar_receta(req: RecetaRequest):
    items = obtener_alacena(req.perfil)
    if not items:
        return {"status": "error", "error": "La alacena está vacía"}
    ingredientes = ", ".join([f"{i['ingrediente']} ({i['cantidad']})" if i['cantidad'] else i['ingrediente'] for i in items])
    receta = generar_receta_alacena(req.perfil, ingredientes)
    return {"status": "success", "receta": receta}


# ============================================================
# RUTINAS IA (fix endpoint 404)
# ============================================================

class RutinaIARequest(BaseModel):
    perfil: str
    prompt: str

@app.post("/api/rutinas/generar")
def generar_rutina_endpoint(req: RutinaIARequest):
    try:
        perfil_info = obtener_perfil(req.perfil) or {}
        rutina_generada, explicacion = generar_rutina_inteligente(
            req.prompt,
            perfil_info.get("descripcion", "")
        )
        return {"status": "success", "rutina": rutina_generada, "explicacion": explicacion}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"status": "error", "error": str(e)}

class ReemplazoIARequest(BaseModel):
    perfil: str
    ejercicio_actual: str
    target: str
    motivo: Optional[str] = ""

@app.post("/api/rutinas/reemplazar")
def reemplazar_rutina_ia(req: ReemplazoIARequest):
    try:
        from core.ai import sugerir_reemplazo_ia, UI_MUSCULO_ES, TECNICO_MAP
        res = sugerir_reemplazo_ia(req.ejercicio_actual, req.target, req.motivo)
        if not res: return {"status": "error", "error": "IA no disponible"}
        
        id_nuevo = res.get("id_nuevo")
        row = buscar_ejercicio_por_id(id_nuevo)
        if not row: return {"status": "error", "error": f"ID {id_nuevo} no disponible en Firestore"}
        
        t_raw = (row.get('target') or "chest").lower()
        t_tecnico = TECNICO_MAP.get(t_raw, t_raw)
        
        alternativa = {
            "id": row.get('id_ejercicio'),
            "id_ejercicio": row.get('id_ejercicio'),
            "nombre_es": row.get('nombre_es'),
            "target": t_tecnico,
            "body_part": UI_MUSCULO_ES.get(t_tecnico, t_tecnico.capitalize()),
            "gif_url": fix_gif_url(row.get('gif_url')),
            "equipment": row.get('equipment')
        }
        
        return {"status": "success", "alternativa": alternativa, "mensaje": res.get("mensaje")}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ============================================================
# RUTINAS GUARDADAS
# ============================================================

class GuardarRutinaRequest(BaseModel):
    perfil: str
    nombre: str
    descripcion: str = ""
    ejercicios: list

@app.post("/api/rutinas/guardar")
def guardar_rutina_endpoint(req: GuardarRutinaRequest):
    try:
        guardar_rutina(req.perfil, req.nombre, req.descripcion, req.ejercicios)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/api/rutinas/mis-rutinas")
def get_mis_rutinas(perfil: str):
    try:
        rutinas = obtener_rutinas(perfil)
        return {"status": "success", "rutinas": rutinas}
    except Exception as e:
        return {"status": "error", "rutinas": [], "error": str(e)}

@app.delete("/api/rutinas/{rutina_id}")
def delete_rutina(rutina_id: str, perfil: str):
    eliminar_rutina_perfil(perfil, rutina_id)
    return {"status": "success"}


# ============================================================
# LOG DE COMIDAS HOY
# ============================================================

@app.get("/api/nutricion/comidas-hoy")
def get_comidas_hoy(perfil: str):
    try:
        comidas = obtener_comidas_hoy(perfil)
        return {"status": "success", "comidas": comidas}
    except Exception as e:
        return {"status": "error", "comidas": [], "error": str(e)}

@app.delete("/api/nutricion/evento/{evento_id}")
def delete_evento_nutricion(evento_id: str, perfil: str):
    eliminar_evento_perfil(perfil, evento_id)
    return {"status": "success"}

# ============================================================
# GRÁFICOS / ANALYTICS
# ============================================================

@app.get("/api/graficos/entrenamientos")
def get_graficos_entrenamientos(perfil: str, dias: int = 30):
    data = obtener_entrenamientos_resumen(perfil, dias)
    return {"status": "success", "data": data}

@app.get("/api/graficos/timeline")
def get_graficos_timeline(perfil: str, limit: int = 50):
    eventos = obtener_eventos_timeline(perfil, limit)
    return {"status": "success", "eventos": eventos}


# ============================================================
# MEMORIA
# ============================================================

@app.post("/api/memoria/refresh")
def refresh_memoria(perfil: str):
    """Fuerza la regeneración de la memoria viva."""
    try:
        generar_y_guardar_contexto(perfil)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    # En producción Render establece la variable de entorno PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
