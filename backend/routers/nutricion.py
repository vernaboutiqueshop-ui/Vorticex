from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from core.auth import get_current_user
from core.database import (
    guardar_evento, obtener_alacena, guardar_en_alacena,
    eliminar_de_alacena_perfil, obtener_macros_hoy,
    obtener_ayuno, actualizar_ayuno, obtener_comidas_hoy,
    eliminar_evento_perfil
)
from core.ai import estimar_nutricion_ollama, generar_receta_alacena

router = APIRouter(prefix="/api/nutricion", tags=["nutricion"])


class NutricionTextoRequest(BaseModel):
    perfil: str
    alimento: str


class AyunoRequest(BaseModel):
    perfil: str
    en_ayuno: bool
    inicio_iso: Optional[str] = None
    meta_horas: float = 16


class AlacenaRequest(BaseModel):
    perfil: str
    ingrediente: str
    cantidad: str = ""


class AlacenaEditRequest(BaseModel):
    ingrediente: str


class RecetaRequest(BaseModel):
    perfil: str


# --- Análisis nutricional ---
@router.post("/analizar-texto")
def analizar_texto(req: NutricionTextoRequest, user: str = Depends(get_current_user)):
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


@router.post("/analizar-foto")
async def analizar_foto(perfil: str, file: UploadFile = File(...), user: str = Depends(get_current_user)):
    return {"status": "error", "error": "Análisis de imágenes no disponible en esta versión."}


@router.get("/macros-hoy")
def macros_hoy(perfil: str, user: str = Depends(get_current_user)):
    macros = obtener_macros_hoy(perfil)
    return {"status": "success", "macros": macros}


@router.get("/comidas-hoy")
def get_comidas_hoy(perfil: str, user: str = Depends(get_current_user)):
    try:
        comidas = obtener_comidas_hoy(perfil)
        return {"status": "success", "comidas": comidas}
    except Exception as e:
        return {"status": "error", "comidas": [], "error": str(e)}


@router.delete("/evento/{evento_id}")
def delete_evento_nutricion(evento_id: str, perfil: str, user: str = Depends(get_current_user)):
    eliminar_evento_perfil(perfil, evento_id)
    return {"status": "success"}


# --- Ayuno ---
@router.get("/ayuno")
def get_ayuno(perfil: str, user: str = Depends(get_current_user)):
    datos = obtener_ayuno(perfil)
    return {"status": "success", "ayuno": datos}


@router.post("/ayuno")
def set_ayuno(req: AyunoRequest, user: str = Depends(get_current_user)):
    actualizar_ayuno(req.perfil, req.en_ayuno, req.inicio_iso, req.meta_horas)
    return {"status": "success"}


# --- Alacena ---
@router.get("/alacena")
def get_alacena(perfil: str, user: str = Depends(get_current_user)):
    # Ruta mantenida como /api/nutricion/alacena pero responde a /api/alacena también desde main
    items = obtener_alacena(perfil)
    return {"status": "success", "items": items}
