from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import get_current_user
from core.database import (
    obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
    guardar_evento, obtener_perfil
)
from core.ai import cerebro_vortice_unificado

router = APIRouter(prefix="/api/chat", tags=["chat"])

UI_MUSCULO_ES = {
    "abdominals": "Abdominales", "chest": "Pecho", "biceps": "Bíceps", "triceps": "Tríceps",
    "lats": "Espalda", "lower back": "Espalda Baja", "middle back": "Espalda",
    "quadriceps": "Cuádriceps", "hamstrings": "Isquios", "calves": "Pantorrillas",
    "shoulders": "Hombros", "glutes": "Glúteos", "traps": "Trapecios", "forearms": "Antebrazo"
}


class ChatRequest(BaseModel):
    perfil: str
    mensaje: str


@router.post("")
def send_chat(req: ChatRequest, user: str = Depends(get_current_user)):
    try:
        perfil_info = obtener_perfil(req.perfil) or {}

        # 1. Recuperar contexto de corto plazo (últimos 5)
        historial_dicts = obtener_historial_chat(req.perfil, limite=5)
        hist_txt = "\n".join([f"{h['rol']}: {h['contenido']}" for h in historial_dicts])

        # 2. Guardar mensaje del usuario
        guardar_mensaje(req.perfil, "user", req.mensaje)

        # 3. LLAMADA UNIFICADA AL CEREBRO VÓRTICE
        resultado = cerebro_vortice_unificado(
            mensaje=req.mensaje,
            perfil_info=perfil_info.get("descripcion", ""),
            historial_previo=hist_txt,
            contexto_vectorial=""
        )

        tipo = resultado.get("tipo", "chat_normal")
        respuesta_ia = resultado.get("respuesta", "Entendido.")

        rutina_gen = None
        nutricion_det = None

        # 4. Actuar según la detección automática del Cerebro
        if tipo == "nutricion" and resultado.get("nutricion"):
            n = resultado["nutricion"]
            nutricion_det = n
            guardar_evento(req.perfil, "Nutricion", n.get('alimento', 'Comida'), "Auto", n.get('cal', 0), n.get('prot', 0), n.get('carb', 0), n.get('gras', 0))

        elif (tipo == "rutina" or tipo == "gym") and (resultado.get("rutina") or resultado.get("ejercicios")):
            raw_rutina = resultado.get("rutina") or resultado.get("ejercicios", [])
            rutina_gen = []

            from core.database_sqlite import buscar_ejercicio_por_id

            for r in raw_rutina:
                eid = r.get("id") or r.get("id_ejercicio")
                if not eid:
                    continue

                orig = buscar_ejercicio_por_id(str(eid))
                if orig:
                    rutina_gen.append({
                        "id_ejercicio": orig['id_ejercicio'],
                        "nombre_es": orig['nombre_es'].capitalize(),
                        "target": orig.get('target', ''),
                        "body_part": UI_MUSCULO_ES.get(str(orig.get('target', '')).lower(), str(orig.get('target', '')).capitalize() or "General"),
                        "gif_url": orig.get('gif_url', f"/gifs/{orig['id_ejercicio']}.gif"),
                        "sets": [{"reps": r.get("reps", "12"), "kg": "", "done": False} for _ in range(r.get("series", 3))]
                    })

        # 5. Guardar y Responder
        guardar_mensaje(req.perfil, "assistant", respuesta_ia)

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


@router.get("/historial")
def get_chat_history(perfil: str, user: str = Depends(get_current_user)):
    hist = obtener_historial_chat(perfil, limite=30)
    return {"historial": hist}


@router.delete("/historial")
def delete_chat_history(perfil: str, user: str = Depends(get_current_user)):
    borrar_historial_chat(perfil)
    guardar_evento(perfil, "Limpieza", "Se eliminó el historial de chat", "Neutro", 0)
    return {"status": "success"}
