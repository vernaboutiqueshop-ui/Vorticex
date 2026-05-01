from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from core.auth import get_current_user
from core.database import (
    guardar_evento, obtener_alacena, guardar_en_alacena,
    eliminar_de_alacena_perfil, obtener_macros_hoy,
    obtener_ayuno, actualizar_ayuno, obtener_comidas_hoy,
    eliminar_evento_perfil,
    obtener_metas_nutricion, guardar_metas_nutricion,
    obtener_agua_hoy, agregar_agua, resetear_agua,
    obtener_historial_nutricion
)
from core.ai import estimar_nutricion_ollama, generar_receta_alacena, analizar_foto_gemini
from core.database import guardar_alimento_cache, obtener_alimento_por_id
from core.nutrition_search import busqueda_hibrida, normalizar_a_100g

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


class MetasNutricionRequest(BaseModel):
    perfil: str
    cal_goal: float = 2200
    prot_goal: float = 150
    carb_goal: float = 250
    fat_goal: float = 70


class WaterRequest(BaseModel):
    perfil: str
    glasses: int = 1


class FoodSearchRequest(BaseModel):
    perfil: str
    query: str


class LogFromCacheRequest(BaseModel):
    perfil: str
    alimento_id: Optional[int] = None
    nombre: str = ""
    cal_100: float = 0
    prot_100: float = 0
    carb_100: float = 0
    fat_100: float = 0
    gramos: float = 100


# --- Hybrid food search ---
@router.post("/buscar")
async def buscar_alimento_hibrido(req: FoodSearchRequest, user: str = Depends(get_current_user)):
    try:
        result = await busqueda_hibrida(req.perfil, req.query)
        all_items = result["cache"] + result["external"]
        return {"status": "success", "items": all_items, "source": result["source"]}
    except Exception as e:
        return {"status": "error", "error": str(e), "items": []}


@router.post("/log-from-cache")
def log_from_cache(req: LogFromCacheRequest, user: str = Depends(get_current_user)):
    """Log a meal from cache or manual entry. Scales macros by gramos."""
    try:
        cal = req.cal_100
        prot = req.prot_100
        carb = req.carb_100
        fat = req.fat_100
        nombre = req.nombre

        if req.alimento_id:
            food = obtener_alimento_por_id(req.perfil, req.alimento_id)
            if food:
                cal = food["cal_100"]
                prot = food["prot_100"]
                carb = food["carb_100"]
                fat = food["fat_100"]
                nombre = food["nombre"]

        factor = req.gramos / 100.0
        guardar_evento(
            req.perfil, "Nutricion",
            f"{nombre} ({int(req.gramos)}g)",
            "Cache",
            round(cal * factor, 1),
            round(prot * factor, 1),
            round(carb * factor, 1),
            round(fat * factor, 1),
        )
        return {"status": "success", "logged": {
            "nombre": nombre, "gramos": req.gramos,
            "calorias": round(cal * factor, 1),
            "proteinas": round(prot * factor, 1),
            "carbos": round(carb * factor, 1),
            "grasas": round(fat * factor, 1),
        }}
    except Exception as e:
        return {"status": "error", "error": str(e)}


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
    try:
        image_bytes = await file.read()
        resultado = analizar_foto_gemini(image_bytes)
        if resultado:
            guardar_evento(
                perfil, "Nutricion", resultado.get("descripcion", resultado.get("alimento", "Foto")),
                "Foto", resultado.get("calorias", 0), resultado.get("proteinas", 0),
                resultado.get("carbos", 0), resultado.get("grasas", 0)
            )
            return {"status": "success", "resultado": resultado}
        return {"status": "error", "error": "No se pudo analizar la foto"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


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


# --- Metas nutricionales ---
@router.get("/metas")
def get_metas(perfil: str, user: str = Depends(get_current_user)):
    metas = obtener_metas_nutricion(perfil)
    return {"status": "success", "metas": metas}


@router.post("/metas")
def set_metas(req: MetasNutricionRequest, user: str = Depends(get_current_user)):
    guardar_metas_nutricion(req.perfil, req.cal_goal, req.prot_goal, req.carb_goal, req.fat_goal)
    return {"status": "success"}


# --- Water tracking ---
@router.get("/agua")
def get_agua(perfil: str, user: str = Depends(get_current_user)):
    glasses = obtener_agua_hoy(perfil)
    return {"status": "success", "glasses": glasses}


@router.post("/agua")
def add_agua(req: WaterRequest, user: str = Depends(get_current_user)):
    total = agregar_agua(req.perfil, req.glasses)
    return {"status": "success", "glasses": total}


@router.post("/agua/reset")
def reset_agua(req: WaterRequest, user: str = Depends(get_current_user)):
    resetear_agua(req.perfil)
    return {"status": "success", "glasses": 0}


# --- Historial semanal ---
@router.get("/historial")
def get_historial(perfil: str, dias: int = 7, user: str = Depends(get_current_user)):
    data = obtener_historial_nutricion(perfil, dias)
    return {"status": "success", "historial": data}


# --- Alacena ---
@router.get("/alacena")
def get_alacena(perfil: str, user: str = Depends(get_current_user)):
    items = obtener_alacena(perfil)
    return {"status": "success", "items": items}
