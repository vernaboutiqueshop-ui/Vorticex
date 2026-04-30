from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List

from core.auth import get_current_user
from core.database import (
    guardar_log_set, guardar_evento, guardar_mensaje,
    obtener_entrenamientos_resumen
)
from core.database_sqlite import (
    obtener_catalogo_completo, buscar_ejercicio_por_id,
    buscar_ejercicios_por_ids, buscar_ejercicios_textual,
    obtener_conteos_ejercicios, obtener_intensidad_muscular,
    obtener_ultimos_pesos, obtener_rutinas_templates,
    guardar_rutina_template, eliminar_rutina, actualizar_rutina_template,
    obtener_carpetas, guardar_carpeta, eliminar_carpeta,
    obtener_rutina_publica, eliminar_evento_historial,
    obtener_ultimo_peso, guardar_sesion_gym,
    obtener_historial_gym, actualizar_rating_sesion, MAX_FOLDERS,
    obtener_intensidad_muscular_periodo,
    obtener_deportes_usuario, agregar_deporte_usuario, eliminar_deporte_usuario,
    registrar_sesion_deporte, obtener_historial_deportes, calcular_calorias_deporte,
    obtener_historial_unificado
)
from core.intelligence import semantic_search_exercises

router = APIRouter(prefix="/api/gym", tags=["gym"])

UI_MUSCULO_ES = {
    "abdominals": "Abdominales", "chest": "Pecho", "biceps": "Bíceps", "triceps": "Tríceps",
    "lats": "Espalda", "lower back": "Espalda Baja", "middle back": "Espalda",
    "quadriceps": "Cuádriceps", "hamstrings": "Isquios", "calves": "Pantorrillas",
    "shoulders": "Hombros", "glutes": "Glúteos", "traps": "Trapecios", "forearms": "Antebrazo"
}


# --- Modelos ---
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
    duration_seconds: Optional[int] = 0
    routine_id: Optional[int] = None


class RutinaNuevaRequest(BaseModel):
    perfil: str
    nombre: str
    ejercicios: list
    folder_id: Optional[int] = None


class RutinaUpdatePayload(BaseModel):
    nombre: str
    ejercicios: list
    folder_id: Optional[int] = None


class FolderCreateRequest(BaseModel):
    perfil: str
    name: str
    color: Optional[str] = "#06b6d4"


class HistorialPesosRequest(BaseModel):
    perfil: str
    exercise_ids: list


class GymFeedbackRequest(BaseModel):
    perfil: str
    feedback: str
    rating: int = 0
    ejercicios: str = ""


# --- Ejercicios / Catálogo ---
@router.get("/exercises/counts")
def get_exercise_counts():
    try:
        return obtener_conteos_ejercicios()
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/intensidad")
def get_muscle_intensity(perfil: str, user: str = Depends(get_current_user)):
    try:
        intensidad = obtener_intensidad_muscular(perfil)
        return {"status": "success", "intensidad": intensidad}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/muscle-intensity")
def get_muscle_intensity_period(perfil: str, period: str = "week", user: str = Depends(get_current_user)):
    try:
        data = obtener_intensidad_muscular_periodo(perfil, period)
        return {"status": "success", **data}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Carpetas ---
@router.get("/folders")
def get_gym_folders(perfil: str, user: str = Depends(get_current_user)):
    try:
        return {"status": "success", "folders": obtener_carpetas(perfil)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/folders")
def create_gym_folder(req: FolderCreateRequest, user: str = Depends(get_current_user)):
    try:
        fid = guardar_carpeta(req.perfil, req.name, req.color)
        return {"status": "success", "folder_id": fid}
    except ValueError as ve:
        return {"status": "error", "error": str(ve), "max_folders": MAX_FOLDERS}
    except Exception as e:
        return {"status": "error", "error": str(e)}


class FolderColorUpdateRequest(BaseModel):
    color: str


@router.patch("/folders/{fid}/color")
def update_folder_color(fid: int, req: FolderColorUpdateRequest, user: str = Depends(get_current_user)):
    try:
        from core.database_sqlite import get_conn
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE gym_folders SET color = ? WHERE id = ?", (req.color, fid))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.delete("/folders/{fid}")
def delete_gym_folder(fid: int, user: str = Depends(get_current_user)):
    try:
        eliminar_carpeta(fid)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Rutinas ---
@router.post("/rutina/nueva")
def api_nueva_rutina(req: RutinaNuevaRequest, user: str = Depends(get_current_user)):
    try:
        rid = guardar_rutina_template(req.perfil, req.nombre, req.ejercicios, req.folder_id)
        return {"status": "success", "id_rutina": rid}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.delete("/rutina/{rid}")
def api_eliminar_rutina(rid: int, user: str = Depends(get_current_user)):
    try:
        eliminar_rutina(rid)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.put("/rutina/{rid}")
def api_actualizar_rutina(rid: int, req: RutinaUpdatePayload, user: str = Depends(get_current_user)):
    try:
        actualizar_rutina_template(rid, req.nombre, req.ejercicios, req.folder_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/rutinas")
def get_rutinas(perfil: str, user: str = Depends(get_current_user)):
    try:
        rutinas = obtener_rutinas_templates(perfil)
        return {"status": "success", "rutinas": rutinas}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/rutina/publica/{routine_id}")
def get_public_routine(routine_id: int):
    try:
        rutina = obtener_rutina_publica(routine_id)
        if not rutina:
            return {"status": "error", "error": "Rutina no encontrada"}
        return {"status": "success", "rutina": rutina}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Historial de pesos ---
@router.post("/historial/pesos")
def api_historial_pesos(req: HistorialPesosRequest, user: str = Depends(get_current_user)):
    try:
        pesos = obtener_ultimos_pesos(req.perfil, req.exercise_ids)
        return {"status": "success", "pesos": pesos}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Guardar sesión ---
@router.post("/guardar")
def guardar_sesion(req: RutinaSaveRequest, user: str = Depends(get_current_user)):
    try:
        rutina_data = []
        for ej in req.rutina:
            rutina_data.append({
                "id_ejercicio": ej.id_ejercicio,
                "target": ej.target,
                "sets": [{"done": s.done, "kg": s.kg, "reps": s.reps} for s in ej.sets]
            })
        result = guardar_sesion_gym(req.perfil, rutina_data)
        if result.get("status") == "success":
            duration_txt = ""
            if req.duration_seconds:
                mins = req.duration_seconds // 60
                duration_txt = f" ({mins} min)"
            guardar_evento(
                req.perfil, "GymSession",
                f"Sesión terminada. Volumen: {result['volumen']:.0f}kg. +{result['exp_ganada']} EXP{duration_txt}",
                "Sólido", result['exp_ganada'],
                prot=req.routine_id or 0, duration=req.duration_seconds
            )
        return result
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"status": "error", "error": str(e)}


@router.delete("/historial/{event_id}")
def delete_gym_history(event_id: int, perfil: str, user: str = Depends(get_current_user)):
    try:
        eliminar_evento_historial(perfil, event_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Historial de sesiones ---
@router.get("/history")
def get_gym_history(perfil: str, user: str = Depends(get_current_user)):
    try:
        history = obtener_historial_gym(perfil)
        return {"status": "success", "history": history}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/history/unified")
def get_unified_history(perfil: str, user: str = Depends(get_current_user)):
    try:
        return {"status": "success", "history": obtener_historial_unificado(perfil)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


class RatingUpdateRequest(BaseModel):
    perfil: str
    rating: int


class TimestampUpdateRequest(BaseModel):
    perfil: str
    timestamp: str


@router.patch("/history/{event_id}/rating")
def update_session_rating(event_id: int, req: RatingUpdateRequest, user: str = Depends(get_current_user)):
    try:
        ok = actualizar_rating_sesion(event_id, req.perfil, req.rating)
        return {"status": "success" if ok else "error"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.patch("/history/{event_id}/timestamp")
def update_session_timestamp(event_id: int, req: TimestampUpdateRequest, user: str = Depends(get_current_user)):
    try:
        from core.database_sqlite import get_conn
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """UPDATE activity_logs SET timestamp = ?
                   WHERE id = ? AND user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))""",
                (req.timestamp, event_id, req.perfil),
            )
            conn.commit()
            return {"status": "success" if cur.rowcount > 0 else "error"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Feedback ---
@router.post("/feedback")
def gym_feedback(req: GymFeedbackRequest, user: str = Depends(get_current_user)):
    try:
        guardar_evento(
            req.perfil, "Feedback_Gym",
            f"Rating: {req.rating}/5 | Ejercicios: {req.ejercicios} | Comentario: {req.feedback}",
            "Feedback", 0
        )
        feedback_msg = f"[Sistema: El usuario acabó de entrenar ({req.ejercicios}) y dejó este feedback (rating {req.rating}/5): '{req.feedback}'. Tené esto en cuenta en la próxima conversación.]"
        guardar_mensaje(req.perfil, "system", feedback_msg)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Gamificación ---
@router.get("/stats/{perfil}")
def get_gym_stats(perfil: str, user: str = Depends(get_current_user)):
    from core.database_sqlite import obtener_racha
    try:
        return {"status": "success", **obtener_racha(perfil)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ═══════════════════════════ DEPORTES ═══════════════════════════

class SportCreateRequest(BaseModel):
    perfil: str
    name: str
    icon: Optional[str] = "⚡"
    color: Optional[str] = "#06b6d4"


class SportSessionRequest(BaseModel):
    perfil: str
    sport_name: str
    duracion_min: float
    intensidad: int = 5
    sport_id: Optional[int] = None


class SportCalcRequest(BaseModel):
    peso_kg: float
    deporte: str
    duracion_min: float
    intensidad: int = 5


@router.get("/sports")
def get_user_sports(perfil: str, user: str = Depends(get_current_user)):
    try:
        return {"status": "success", "sports": obtener_deportes_usuario(perfil)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/sports")
def add_user_sport(req: SportCreateRequest, user: str = Depends(get_current_user)):
    try:
        sid = agregar_deporte_usuario(req.perfil, req.name, req.icon, req.color)
        if sid is None:
            return {"status": "error", "error": "User not found"}
        return {"status": "success", "sport_id": sid}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.delete("/sports/{sport_id}")
def delete_user_sport(sport_id: int, user: str = Depends(get_current_user)):
    try:
        eliminar_deporte_usuario(sport_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/sports/session")
def log_sport_session(req: SportSessionRequest, user: str = Depends(get_current_user)):
    try:
        result = registrar_sesion_deporte(
            req.perfil, req.sport_name, req.duracion_min, req.intensidad, req.sport_id
        )
        return result
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/sports/history")
def get_sport_history(perfil: str, user: str = Depends(get_current_user)):
    try:
        return {"status": "success", "sessions": obtener_historial_deportes(perfil)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/sports/calc")
def calc_sport_calories(req: SportCalcRequest):
    """Preview calorie calculation without logging anything."""
    try:
        return {"status": "success", **calcular_calorias_deporte(
            req.peso_kg, req.deporte, req.duracion_min, req.intensidad
        )}
    except Exception as e:
        return {"status": "error", "error": str(e)}
