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
    obtener_historial_nutricion,
    get_preferencias_usuario, guardar_preferencias_usuario,
    obtener_comidas_fecha,
    guardar_sesion_ayuno, obtener_historial_ayuno,
    buscar_recetas_por_ingredientes, guardar_recetas_cache, validar_receta,
    guardar_en_cache_global, obtener_trending_alimentos,
)
from core.ai import estimar_nutricion_ollama, generar_receta_alacena, analizar_foto_gemini, analizar_foto_groq, generar_recetas_cards, parsear_alimentos_texto
from core.database import guardar_alimento_cache, obtener_alimento_por_id
from core.nutrition_search import busqueda_hibrida

router = APIRouter(prefix="/api/nutricion", tags=["nutricion"])


class NutricionTextoRequest(BaseModel):
    perfil: str
    alimento: str
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "alimento": "2 huevos revueltos con tostada integral"
    }}}


class AyunoRequest(BaseModel):
    perfil: str
    en_ayuno: Optional[bool] = None  # None = solo actualiza meta_horas sin cambiar estado
    inicio_iso: Optional[str] = None
    meta_horas: float = 16
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "en_ayuno": True,
        "inicio_iso": "2025-05-01T20:00:00",
        "meta_horas": 16
    }}}


class AlacenaRequest(BaseModel):
    perfil: str
    ingrediente: str
    cantidad: str = ""
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "ingrediente": "Pechuga de pollo",
        "cantidad": "500g"
    }}}


class AlacenaEditRequest(BaseModel):
    ingrediente: str


class RecetaRequest(BaseModel):
    perfil: str
    model_config = {"json_schema_extra": {"example": {"perfil": "Gonza"}}}


class MetasNutricionRequest(BaseModel):
    perfil: str
    cal_goal: float = 2200
    prot_goal: float = 150
    carb_goal: float = 250
    fat_goal: float = 70
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "cal_goal": 2400,
        "prot_goal": 180,
        "carb_goal": 260,
        "fat_goal": 65
    }}}


class WaterRequest(BaseModel):
    perfil: str
    glasses: int = 1
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "glasses": 1
    }}}


class FoodSearchRequest(BaseModel):
    perfil: str
    query: str
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "query": "arroz integral"
    }}}


class LogFromCacheRequest(BaseModel):
    perfil: str
    alimento_id: Optional[int] = None
    nombre: str = ""
    cal_100: float = 0
    prot_100: float = 0
    carb_100: float = 0
    fat_100: float = 0
    gramos: float = 100
    source: str = "manual"  # 'foto' | 'ia' | 'groq' | 'natural' | 'openfoodfacts' | 'manual'
    model_config = {"json_schema_extra": {"example": {
        "perfil": "Gonza",
        "nombre": "Arroz integral cocido",
        "cal_100": 123,
        "prot_100": 2.7,
        "carb_100": 25.6,
        "fat_100": 1.0,
        "gramos": 200,
        "source": "ia"
    }}}


class ParsearTextoRequest(BaseModel):
    texto: str

@router.post("/parsear")
async def parsear_texto_libre(req: ParsearTextoRequest, user: str = Depends(get_current_user)):
    """Usa IA (Groq) para extraer alimentos y gramos de texto libre."""
    items = await parsear_alimentos_texto(req.texto)
    return {"status": "success", "items": items}


@router.post("/buscar-inteligente")
async def buscar_inteligente(req: NutricionTextoRequest, user: str = Depends(get_current_user)):
    """One-shot: entiende texto libre → busca en cache → estima macros → listo para confirmar.
    Sin pasos intermedios. Devuelve items listos para log con macros ya calculados."""
    import re as _re
    texto = req.alimento.strip()
    if not texto:
        return {"status": "error", "items": []}

    # Decide si parsear con IA (texto complejo) o tratar como alimento único
    has_gramos = bool(_re.search(r'\d+\s*(?:g\b|gr\b|gramos?\b)', texto, _re.I))
    has_comma = ',' in texto
    multi_numbers = len(_re.findall(r'\d+\s*(?:g\b|gr\b|gramos?\b)', texto, _re.I)) > 1

    parsed = []
    if has_gramos and (has_comma or multi_numbers or len(texto.split()) > 4):
        parsed = await parsear_alimentos_texto(texto)

    if not parsed:
        # Extraer gramos simples si hay un número al inicio/final
        m = _re.match(r'^(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|de\b)?\s+(.+)$', texto, _re.I)
        if m:
            parsed = [{"alimento": m.group(2).strip(), "gramos": float(m.group(1).replace(',', '.'))}]
        else:
            m2 = _re.match(r'^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b)$', texto, _re.I)
            if m2:
                parsed = [{"alimento": m2.group(1).strip(), "gramos": float(m2.group(2).replace(',', '.'))}]
            else:
                parsed = [{"alimento": texto, "gramos": 100}]

    results = []
    for item in parsed:
        nombre = item.get("alimento", "")
        gramos = float(item.get("gramos", 100))
        if not nombre:
            continue

        r = await busqueda_hibrida(req.perfil, nombre)
        todos = r.get('cache', []) + r.get('external', [])

        if todos:
            top = todos[0]
            factor = gramos / 100
            results.append({
                "nombre": top["nombre"],
                "query": nombre,
                "gramos": gramos,
                "kcal": round(top["cal_100"] * factor),
                "proteinas": round(top["prot_100"] * factor, 1),
                "carbos": round(top["carb_100"] * factor, 1),
                "grasas": round(top["fat_100"] * factor, 1),
                "cal_100": top["cal_100"],
                "prot_100": top["prot_100"],
                "carb_100": top["carb_100"],
                "fat_100": top["fat_100"],
                "source": r["source"],
                "alimento_id": top.get("id"),
            })
        # Items not found are silently skipped — UI handles empty response

    return {"status": "success", "items": results}


# --- Hybrid food search ---
@router.post("/buscar")
async def buscar_alimento_hibrido(req: FoodSearchRequest, user: str = Depends(get_current_user)):
    try:
        result = await busqueda_hibrida(req.perfil, req.query)
        all_items = result["cache"] + result["external"]
        # Pass natural_items through unchanged
        if result.get("source") == "natural" and result.get("natural_items"):
            return {"status": "success", "items": [], "natural_items": result["natural_items"], "source": "natural"}
        extra = {}
        if result.get("corrected"):
            extra = {"corrected": True, "previous_cal": result.get("previous_cal")}
        return {"status": "success", "items": all_items, "source": result["source"], **extra}
    except Exception as e:
        return {"status": "error", "error": str(e), "items": []}


@router.post("/log-from-cache")
def log_from_cache(req: LogFromCacheRequest, user: str = Depends(get_current_user)):
    """Log a meal. Scales macros by gramos. Saves to global cache when source is AI/foto/external."""
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
            req.source.capitalize() if req.source != "manual" else "Cache",
            round(cal * factor, 1),
            round(prot * factor, 1),
            round(carb * factor, 1),
            round(fat * factor, 1),
        )

        # Save to community global cache when food came from AI/external and has no cache entry
        # 'off' = OpenFoodFacts direct item source (mapped here to 'openfoodfacts')
        SOURCES_TO_CACHE = {"foto", "ia", "groq", "natural", "openfoodfacts", "off"}
        cache_source = "openfoodfacts" if req.source == "off" else req.source
        if not req.alimento_id and req.source in SOURCES_TO_CACHE and cal > 0 and nombre.strip():
            try:
                guardar_en_cache_global(nombre, cal, prot, carb, fat, source=cache_source)
            except Exception as e:
                print(f"[CACHE GLOBAL] Error guardando '{nombre}': {e}")

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
        from core.ai import analizar_foto_vortice
        image_bytes = await file.read()
        resultado = await analizar_foto_vortice(image_bytes)
        if resultado:
            guardar_evento(
                perfil, "Nutricion",
                resultado.get("alimento", "Foto"),
                "Foto",
                resultado.get("calorias", 0), resultado.get("proteinas", 0),
                resultado.get("carbos", 0), resultado.get("grasas", 0)
            )
            return {"status": "success", "resultado": resultado}
        return {"status": "error", "error": "No se pudo analizar la foto con los motores disponibles"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


class PreferenciasRequest(BaseModel):
    perfil: str
    preferencias: dict

@router.get("/preferencias")
def get_prefs(perfil: str, user: str = Depends(get_current_user)):
    prefs = get_preferencias_usuario(perfil)
    return {"status": "success", "preferencias": prefs}

@router.post("/preferencias")
def save_prefs(req: PreferenciasRequest, user: str = Depends(get_current_user)):
    guardar_preferencias_usuario(req.perfil, req.preferencias)
    return {"status": "success"}


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


@router.get("/comidas-fecha")
def get_comidas_fecha(perfil: str, fecha: str, user: str = Depends(get_current_user)):
    try:
        comidas = obtener_comidas_fecha(perfil, fecha)
        return {"status": "success", "comidas": comidas}
    except Exception as e:
        return {"status": "error", "comidas": [], "error": str(e)}


@router.get("/dashboard-hoy")
def get_dashboard_hoy(perfil: str, user: str = Depends(get_current_user)):
    try:
        # Consultas rápidas e independientes
        return {
            "status": "success",
            "macros": obtener_macros_hoy(perfil),
            "comidas": obtener_comidas_hoy(perfil),
            "agua": obtener_agua_hoy(perfil),
            "metas": obtener_metas_nutricion(perfil),
            "ayuno": obtener_ayuno(perfil),
            "historial": obtener_historial_nutricion(perfil, 7)
        }
    except Exception as e:
        print(f"[DASHBOARD ERROR] {e}")
        return {"status": "error", "error": "Error parcial al cargar el dashboard"}


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
    from datetime import datetime
    en_ayuno = req.en_ayuno
    inicio_iso = req.inicio_iso
    if en_ayuno is None:
        # Solo actualizar meta_horas — preservar estado actual
        actual = obtener_ayuno(req.perfil)
        en_ayuno = actual.get("en_ayuno", False) if actual else False
        inicio_iso = actual.get("inicio") if actual else None
    else:
        # Stopping a fast → save the session record
        if en_ayuno is False:
            actual = obtener_ayuno(req.perfil)
            if actual and actual.get("en_ayuno") and actual.get("inicio"):
                try:
                    start = datetime.fromisoformat(actual["inicio"])
                    end = datetime.now()
                    actual_h = (end - start).total_seconds() / 3600
                    goal_h = actual.get("meta_horas", 0) or 0
                    completed = actual_h >= goal_h if goal_h > 0 else False
                    guardar_sesion_ayuno(
                        req.perfil,
                        actual["inicio"],
                        end.isoformat(),
                        goal_h,
                        actual_h,
                        completed,
                    )
                except Exception as e:
                    print(f"[AYUNO] Error guardando sesión: {e}")
    actualizar_ayuno(req.perfil, en_ayuno, inicio_iso, req.meta_horas)
    return {"status": "success"}


@router.get("/ayuno/historial")
def get_ayuno_historial(perfil: str, user: str = Depends(get_current_user)):
    data = obtener_historial_ayuno(perfil, limit=30)
    return {"status": "success", "historial": data}


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


# --- Trending comunitario ---
@router.get("/trending")
def get_trending(dias: int = 7, limit: int = 10, user: str = Depends(get_current_user)):
    """Top foods logged by the community in the last N days. No AI, pure SQL."""
    data = obtener_trending_alimentos(dias=dias, limit=limit)
    return {"status": "success", "trending": data, "dias": dias}


# --- Alacena ---
@router.get("/alacena")
def get_alacena(perfil: str, user: str = Depends(get_current_user)):
    items = obtener_alacena(perfil)
    return {"status": "success", "items": items}
