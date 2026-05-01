from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from core.auth import get_current_user
from core.database import (
    obtener_perfil, guardar_perfil, listar_perfiles, obtener_memoria_perfil,
    obtener_eventos_timeline
)

router = APIRouter(prefix="/api", tags=["perfiles"])


@router.get("/perfiles")
def get_perfiles_endpoint(user: str = Depends(get_current_user)):
    return listar_perfiles()


ADMIN_USERS = ["gonza"]

@router.get("/perfil/{nombre}")
def get_perfil_endpoint(nombre: str, user: str = Depends(get_current_user)):
    perfil = obtener_perfil(nombre)
    if perfil:
        memoria = obtener_memoria_perfil(nombre)
        perfil["memoria_viva"] = memoria["contexto_narrativo"] if memoria else "Sin contexto generado aún."
        perfil["is_admin"] = nombre.lower() in ADMIN_USERS
        return {"status": "success", "perfil": perfil, "nombre": nombre}
    return {"status": "error", "error": "Perfil no encontrado"}


class PerfilUpdate(BaseModel):
    descripcion: str
    detalle: str
    objetivo_ia: str


@router.put("/perfil/{nombre}")
def update_perfil_endpoint(nombre: str, data: PerfilUpdate, user: str = Depends(get_current_user)):
    try:
        guardar_perfil(nombre, data.dict())
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/logs")
def debug_audit(perfil: str, user: str = Depends(get_current_user)):
    try:
        logs = obtener_eventos_timeline(perfil, 50)
        return {"status": "success", "logs": logs}
    except Exception as e:
        return {"status": "error", "error": str(e)}


class UserStatsUpdate(BaseModel):
    name: str
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    language: Optional[str] = 'es'


class AvatarUpdate(BaseModel):
    profile_pic: str


class FeedbackRequest(BaseModel):
    perfil: str
    message: str


@router.post("/perfil/{perfil}/update_stats")
def update_user_stats(perfil: str, req: UserStatsUpdate, user: str = Depends(get_current_user)):
    try:
        from core.database_sqlite import actualizar_perfil_elite
        actualizar_perfil_elite(perfil, req.age, req.weight, req.height, req.language)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/perfil/{perfil}/avatar")
def update_user_avatar(perfil: str, req: AvatarUpdate, user: str = Depends(get_current_user)):
    try:
        from core.database_sqlite import actualizar_avatar_elite
        actualizar_avatar_elite(perfil, req.profile_pic)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/perfil/feedback")
def save_feedback(req: FeedbackRequest, user: str = Depends(get_current_user)):
    try:
        from core.database_sqlite import guardar_feedback
        ok = guardar_feedback(req.perfil, req.message)
        if ok is False:
            return {"status": "rate_limited", "detail": "Esperá un minuto antes de enviar otro mensaje"}
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}
