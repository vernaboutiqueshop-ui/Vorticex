from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sys
import os
import json
import sqlite3
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.config import DB_FILE, PERFILES_FILE
from core.database import (
    inicializar_archivos, obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
    consultar_datos, guardar_log_set, guardar_evento, 
    obtener_alacena, guardar_en_alacena, eliminar_de_alacena,
    obtener_entrenamientos_resumen, obtener_eventos_timeline, obtener_macros_hoy,
    obtener_ayuno, actualizar_ayuno,
    guardar_rutina, obtener_rutinas, eliminar_rutina,
    obtener_comidas_hoy, eliminar_evento
)
from core.ai import (
    consultar_ollama, clasificar_intencion, generar_rutina_inteligente,
    estimar_nutricion_ollama, analizar_imagen_ollama, generar_receta_alacena
)
from personality.prompt_builder import build_system_prompt
from personality.motor_memoria import generar_y_guardar_contexto

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Acciones al iniciar
    inicializar_archivos()
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
    return {"status": "ok", "message": "Vórtice Health API is running"}


# ============================================================
# PERFILES
# ============================================================

@app.get("/api/perfiles")
def get_perfiles():
    if os.path.exists(PERFILES_FILE):
        with open(PERFILES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"Gonzalo": {}}

@app.get("/api/perfil/{nombre}")
def get_perfil(nombre: str):
    if os.path.exists(PERFILES_FILE):
        with open(PERFILES_FILE, 'r', encoding='utf-8') as f:
            perfiles = json.load(f)
        perfil = perfiles.get(nombre, {})
        
        # Agregar memoria viva
        from core.database import obtener_memoria_perfil
        memoria = obtener_memoria_perfil(nombre)
        perfil["memoria_viva"] = memoria["contexto_narrativo"] if memoria else "Sin contexto generado aún."
        
        return {"status": "success", "perfil": perfil, "nombre": nombre}
    return {"status": "error", "error": "Sin perfiles"}

class PerfilUpdate(BaseModel):
    descripcion: str
    detalle: str
    objetivo_ia: str

@app.put("/api/perfil/{nombre}")
def update_perfil(nombre: str, data: PerfilUpdate):
    try:
        perfiles = {}
        if os.path.exists(PERFILES_FILE):
            with open(PERFILES_FILE, 'r', encoding='utf-8') as f:
                perfiles = json.load(f)
        
        perfiles[nombre] = {
            "descripcion": data.descripcion,
            "detalle": data.detalle,
            "objetivo_ia": data.objetivo_ia
        }
        
        with open(PERFILES_FILE, 'w', encoding='utf-8') as f:
            json.dump(perfiles, f, ensure_ascii=False, indent=4)
        
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
        # Cargar perfiles
        perfiles = {}
        if os.path.exists(PERFILES_FILE):
            with open(PERFILES_FILE, 'r', encoding='utf-8') as f:
                perfiles = json.load(f)
        
        perfil_info = perfiles.get(req.perfil, {})
        
        # Guardar mensaje del usuario
        guardar_mensaje(req.perfil, "user", req.mensaje)
        
        # PASO 1: Clasificar la intención del mensaje
        intencion = clasificar_intencion(req.mensaje)
        tipo = intencion.get("tipo", "chat_normal")
        tiene_info = intencion.get("suficiente_info", True)
        datos_extra = intencion.get("datos", "")
        
        response_data = {"status": "success", "tipo_intencion": tipo}
        
        # PASO 2: Actuar según la intención
        if tipo == "rutina" and tiene_info:
            # Generar rutina inteligente
            rutina_generada, explicacion = generar_rutina_inteligente(
                datos_extra or req.mensaje, 
                perfil_info.get("descripcion", "")
            )
            
            respuesta_ia = explicacion if explicacion else "Te armé una rutina basada en tu pedido. Revisala y cargala en el módulo de Gym."
            guardar_mensaje(req.perfil, "assistant", respuesta_ia)
            
            response_data["respuesta"] = respuesta_ia
            response_data["rutina_generada"] = rutina_generada
            
        elif tipo == "rutina" and not tiene_info:
            # Pedir más datos — chat normal pero enfocado
            historial_dicts = obtener_historial_chat(req.perfil, limite=5)
            mensajes_para_ia = [{"role": x["rol"], "content": x["contenido"]} for x in historial_dicts]
            
            sys_prompt = build_system_prompt(req.perfil, perfil_info, consultar_datos("eventos", req.perfil))
            sys_prompt += "\n\nINSTRUCCIÓN EXTRA: El usuario quiere una rutina pero no dio suficientes datos. Preguntale de forma profesional: ¿qué grupos musculares quiere? ¿cuánto tiempo tiene? ¿qué equipamiento tiene disponible? Sé conciso."
            mensajes_para_ia.insert(0, {"role": "system", "content": sys_prompt})
            
            respuesta_ia = consultar_ollama(mensajes_para_ia)
            guardar_mensaje(req.perfil, "assistant", respuesta_ia)
            response_data["respuesta"] = respuesta_ia
            
        elif tipo == "nutricion" and tiene_info:
            # Estimar nutrición y responder
            nutricion = estimar_nutricion_ollama(datos_extra or req.mensaje)
            
            if nutricion:
                guardar_evento(
                    req.perfil, "Nutricion", 
                    nutricion["descripcion"], "Chat", 
                    nutricion["calorias"], nutricion["proteinas"], 
                    nutricion["carbos"], nutricion["grasas"]
                )
                
                respuesta_ia = f"Registré: **{nutricion['alimento']}** — 🔥 {nutricion['calorias']} kcal | 🥩 {nutricion['proteinas']}g prot | 🍞 {nutricion['carbos']}g carbs | 🧈 {nutricion['grasas']}g grasas."
                guardar_mensaje(req.perfil, "assistant", respuesta_ia)
                response_data["respuesta"] = respuesta_ia
                response_data["nutricion_detectada"] = nutricion
            else:
                # Fallback a chat normal si falló la estimación
                response_data = _chat_normal(req, perfil_info)
                
        elif tipo == "alacena" and tiene_info:
            # Estimar calorías y agregar a alacena
            from core.ai import estimar_calorias_ingrediente
            cals = estimar_calorias_ingrediente(datos_extra)
            guardar_en_alacena(req.perfil, datos_extra, "", calorias=cals)
            
            respuesta_ia = f"✅ Agregué **{datos_extra}** a tu alacena (~{cals} kcal). Cuando quieras, pedime una receta con lo que tenés."
            guardar_mensaje(req.perfil, "assistant", respuesta_ia)
            response_data["respuesta"] = respuesta_ia
        else:
            # Chat normal — usar el flujo existente con memoria
            response_data = _chat_normal(req, perfil_info)
        
        return response_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


def _chat_normal(req: ChatRequest, perfil_info: dict):
    """Flujo de chat normal con memoria viva y contexto SQLite."""
    historial_dicts = obtener_historial_chat(req.perfil, limite=5)
    mensajes_para_ia = [{"role": x["rol"], "content": x["contenido"]} for x in historial_dicts]
    
    sys_prompt = build_system_prompt(req.perfil, perfil_info, consultar_datos("eventos", req.perfil))
    mensajes_para_ia.insert(0, {"role": "system", "content": sys_prompt})
    
    respuesta_ia = consultar_ollama(mensajes_para_ia)
    guardar_mensaje(req.perfil, "assistant", respuesta_ia)
    
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
def get_ejercicios():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id_ejercicio, nombre_es, nombre_en, body_part, target, gif_url FROM catalogo_ejercicios")
        rows = cursor.fetchall()
        conn.close()
        return {"status": "success", "ejercicios": [{"id_ejercicio": r[0], "nombre_es": r[1], "nombre_en": r[2] or "", "body_part": r[3], "target": r[4], "gif_url": r[5]} for r in rows]}
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
def delete_alacena(item_id: int):
    eliminar_de_alacena(item_id)
    return {"status": "success"}

class AlacenaEditRequest(BaseModel):
    ingrediente: str

@app.put("/api/alacena/{item_id}")
def edit_alacena(item_id: int, req: AlacenaEditRequest):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('UPDATE alacena SET ingrediente=? WHERE id=?', (req.ingrediente, item_id))
        conn.commit()
        conn.close()
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
        perfiles = {}
        if os.path.exists(PERFILES_FILE):
            with open(PERFILES_FILE, 'r', encoding='utf-8') as f:
                perfiles = json.load(f)
        perfil_info = perfiles.get(req.perfil, {})
        rutina_generada, explicacion = generar_rutina_inteligente(
            req.prompt,
            perfil_info.get("descripcion", "")
        )
        return {"status": "success", "rutina": rutina_generada, "explicacion": explicacion}
    except Exception as e:
        import traceback; traceback.print_exc()
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
def delete_rutina(rutina_id: int):
    eliminar_rutina(rutina_id)
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
def delete_evento_nutricion(evento_id: int):
    eliminar_evento(evento_id)
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
