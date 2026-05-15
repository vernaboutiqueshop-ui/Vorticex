from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.auth import get_current_user
from core.database import (
    obtener_perfil, guardar_evento,
    obtener_alacena, guardar_en_alacena, eliminar_de_alacena_perfil,
    obtener_entrenamientos_resumen, obtener_eventos_timeline,
    guardar_rutina, obtener_rutinas, eliminar_rutina_perfil
)
from core.database_sqlite import (
    obtener_catalogo_completo, buscar_ejercicios_por_ids,
    buscar_ejercicios_textual, obtener_ultimo_peso
)
from core.intelligence import semantic_search_exercises
from core.ai import generar_rutina_inteligente, generar_receta_alacena

router = APIRouter(prefix="/api", tags=["general"])

UI_MUSCULO_ES = {
    "abdominals": "Abdominales", "chest": "Pecho", "biceps": "Bíceps", "triceps": "Tríceps",
    "lats": "Espalda", "lower back": "Espalda Baja", "middle back": "Espalda",
    "quadriceps": "Cuádriceps", "hamstrings": "Isquios", "calves": "Pantorrillas",
    "shoulders": "Hombros", "glutes": "Glúteos", "traps": "Trapecios", "forearms": "Antebrazo"
}


# --- Ejercicios (catálogo y búsqueda) ---
@router.get("/exercises")
def get_ejercicios_endpoint(limit: int = 0, offset: int = 0, lang: str = "es"):
    """
    Obtener catálogo de ejercicios.
    - lang=es|en  (por defecto es)
    - limit=0: devuelve todos (1324 ejercicios)
    """
    try:
        rows = obtener_catalogo_completo(lang=lang)
        total = len(rows)

        if limit > 0:
            rows = rows[offset:offset + limit]

        return {
            "status": "success",
            "total": total,
            "offset": offset,
            "limit": limit if limit > 0 else total,
            "ejercicios": [
                {"id_ejercicio": r['id_ejercicio'], "nombre_es": r['nombre_es'],
                 "body_part": r.get('body_part'), "target": r.get('target'),
                 "gif_url": r.get('gif_url'), "equipment": r.get('equipment', ""),
                 "instrucciones_es": r.get('instrucciones_es', []),
                 "zone": r.get('zone'), "mechanic": r.get('mechanic'),
                 "difficulty": r.get('difficulty_level')} for r in rows
            ]
        }
    except Exception as e:
        return {"status": "error", "ejercicios": [], "error": str(e)}


@router.get("/exercises/search")
def search_ejercicios_endpoint(q: str = ""):
    import time
    start = time.time()
    try:
        res = semantic_search_exercises(q, limit=10)
        ids = res['ids'][0] if res and res['ids'] and len(res['ids']) > 0 else []
        ejercicios = buscar_ejercicios_por_ids(ids)
        duration = (time.time() - start) * 1000
        print(f"[SEARCH] Completado en {duration:.2f}ms. Resultados: {len(ejercicios)}")
        return {"status": "success", "ejercicios": ejercicios}
    except Exception as e:
        print(f"[SEARCH FALLBACK] Error semántico ({e}). Usando búsqueda textual...")
        return {"status": "success", "ejercicios": buscar_ejercicios_textual(q)}


# --- Rutinas IA ---
class RutinaIARequest(BaseModel):
    perfil: str
    prompt: str


@router.post("/rutinas/generar")
def generar_rutina_endpoint(req: RutinaIARequest, user: str = Depends(get_current_user)):
    try:
        perfil_info = obtener_perfil(req.perfil) or {}
        rutina_generada, explicacion = generar_rutina_inteligente(
            req.prompt, req.perfil, perfil_info.get("descripcion", "")
        )
        return {"status": "success", "rutina": rutina_generada, "explicacion": explicacion}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"status": "error", "error": str(e)}


@router.get("/rutinas/ultimo-peso")
def ultimo_peso_endpoint(perfil: str, id_ejercicio: str, user: str = Depends(get_current_user)):
    try:
        peso = obtener_ultimo_peso(perfil, id_ejercicio)
        return {"status": "success", "peso": peso if peso is not None else 0}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Rutinas guardadas (legacy) ---
class GuardarRutinaRequest(BaseModel):
    perfil: str
    nombre: str
    descripcion: str = ""
    ejercicios: list


@router.post("/rutinas/guardar")
def guardar_rutina_endpoint(req: GuardarRutinaRequest, user: str = Depends(get_current_user)):
    try:
        guardar_rutina(req.perfil, req.nombre, req.descripcion, req.ejercicios)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/rutinas/mis-rutinas")
def get_mis_rutinas(perfil: str, user: str = Depends(get_current_user)):
    try:
        rutinas = obtener_rutinas(perfil)
        return {"status": "success", "rutinas": rutinas}
    except Exception as e:
        return {"status": "error", "rutinas": [], "error": str(e)}


@router.delete("/rutinas/{rutina_id}")
def delete_rutina(rutina_id: str, perfil: str, user: str = Depends(get_current_user)):
    eliminar_rutina_perfil(perfil, rutina_id)
    return {"status": "success"}


# --- Alacena ---
class AlacenaRequest(BaseModel):
    perfil: str
    ingrediente: str
    cantidad: str = ""


class RecetaRequest(BaseModel):
    perfil: str
    diet_mode: Optional[str] = None


@router.get("/alacena")
def get_alacena(perfil: str, user: str = Depends(get_current_user)):
    items = obtener_alacena(perfil)
    return {"status": "success", "items": items}


@router.post("/alacena")
def add_alacena(req: AlacenaRequest, user: str = Depends(get_current_user)):
    try:
        guardar_en_alacena(req.perfil, req.ingrediente, req.cantidad, calorias=0)
        guardar_evento(req.perfil, "Audit", f"Alacena: Agregado {req.ingrediente}", "System", 0)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.delete("/alacena/{item_id}")
def delete_alacena(item_id: str, perfil: str, user: str = Depends(get_current_user)):
    eliminar_de_alacena_perfil(perfil, item_id)
    return {"status": "success"}


@router.post("/alacena/receta")
def generar_receta(req: RecetaRequest, user: str = Depends(get_current_user)):
    items = obtener_alacena(req.perfil)
    if not items:
        return {"status": "error", "error": "La alacena está vacía"}
    ingredientes_txt = ", ".join([i["ingrediente"] for i in items])
    receta = generar_receta_alacena(req.perfil, ingredientes_txt, diet_mode=req.diet_mode)
    return {"status": "success", "receta": receta}


# --- Gráficos ---
@router.get("/graficos/entrenamientos")
def get_graficos_entrenamientos(perfil: str, dias: int = 30, user: str = Depends(get_current_user)):
    data_raw = obtener_entrenamientos_resumen(perfil, dias)
    from core.database_sqlite import obtener_intensidad_muscular
    musculos = obtener_intensidad_muscular(perfil)
    data = {
        "por_dia": data_raw,
        "por_musculo": musculos
    }
    return {"status": "success", "data": data}


@router.get("/graficos/timeline")
def get_graficos_timeline(perfil: str, limit: int = 50, user: str = Depends(get_current_user)):
    eventos = obtener_eventos_timeline(perfil, limit)
    return {"status": "success", "eventos": eventos}


# --- Comunidad ---
class PostCreate(BaseModel):
    perfil: str
    content: str
    image_url: Optional[str] = None
    routine_id: Optional[int] = None
    media_type: Optional[str] = None


class CommentCreate(BaseModel):
    post_id: int
    user: str
    content: str


@router.get("/comunidad/feed")
def get_community_feed(user: str = "Anonymous", limit: int = 15, offset: int = 0, current_user: str = Depends(get_current_user)):
    from core.database_sqlite import obtener_posts
    result = obtener_posts(user, limit=limit, offset=offset)
    return {"status": "success", "posts": result["posts"], "has_more": result["has_more"]}


@router.post("/comunidad/post")
def create_community_post(req: PostCreate, user: str = Depends(get_current_user)):
    from core.database_sqlite import guardar_post
    pid = guardar_post(req.perfil, req.content, req.image_url, req.routine_id, req.media_type)
    return {"status": "success", "post_id": pid}


@router.delete("/comunidad/post/{post_id}")
def delete_community_post(post_id: int, user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import eliminar_post
    ok = eliminar_post(post_id, user or current_user)
    if not ok:
        return {"status": "error", "detail": "No se pudo eliminar"}
    return {"status": "success"}


@router.delete("/comunidad/comment/{comment_id}")
def delete_community_comment(comment_id: int, user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import eliminar_comentario
    ok = eliminar_comentario(comment_id, user or current_user)
    if not ok:
        return {"status": "error", "detail": "No se pudo eliminar"}
    return {"status": "success"}


@router.post("/comunidad/clone-routine/{routine_id}")
def clone_routine(routine_id: int, user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import clonar_rutina
    new_id = clonar_rutina(routine_id, user or current_user)
    if not new_id:
        return {"status": "error", "detail": "No se pudo clonar"}
    return {"status": "success", "new_routine_id": new_id}


@router.post("/comunidad/like/{post_id}")
def like_community_post(post_id: int, user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import toggle_like
    liked = toggle_like(post_id, user or current_user)
    return {"status": "success", "liked": liked}


@router.get("/comunidad/post/{post_id}/comments")
def get_post_comments(post_id: int):
    from core.database_sqlite import obtener_comentarios
    return {"status": "success", "comments": obtener_comentarios(post_id)}


@router.post("/comunidad/comment")
def add_community_comment(req: CommentCreate, user: str = Depends(get_current_user)):
    from core.database_sqlite import guardar_comentario
    cid = guardar_comentario(req.post_id, req.user, req.content)
    return {"status": "success", "comment_id": cid}


# --- Followers ---
@router.post("/comunidad/follow/{target_user}")
def follow_user(target_user: str, user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import toggle_follow
    followed = toggle_follow(user or current_user, target_user)
    return {"status": "success", "following": followed}


@router.get("/comunidad/followers/{target_user}")
def get_followers(target_user: str):
    from core.database_sqlite import obtener_seguidores
    return {"status": "success", "followers": obtener_seguidores(target_user)}


@router.get("/comunidad/following/{target_user}")
def get_following(target_user: str):
    from core.database_sqlite import obtener_seguidos
    return {"status": "success", "following": obtener_seguidos(target_user)}


@router.get("/comunidad/follow-counts/{target_user}")
def get_follow_counts(target_user: str):
    from core.database_sqlite import obtener_follow_counts
    return {"status": "success", **obtener_follow_counts(target_user)}


@router.get("/comunidad/is-following/{target_user}")
def check_is_following(target_user: str, user: str = ""):
    from core.database_sqlite import is_following
    return {"status": "success", "is_following": is_following(user, target_user)}


# --- Notifications ---
@router.get("/comunidad/notifications")
def get_notifications(user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import obtener_notificaciones
    return {"status": "success", "notifications": obtener_notificaciones(user or current_user)}


@router.get("/comunidad/notifications/count")
def get_unread_count(user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import contar_notificaciones_no_leidas
    return {"status": "success", "count": contar_notificaciones_no_leidas(user or current_user)}


@router.post("/comunidad/notifications/read")
def mark_notifications_read(user: str = "", current_user: str = Depends(get_current_user)):
    from core.database_sqlite import marcar_notificaciones_leidas
    marcar_notificaciones_leidas(user or current_user)
    return {"status": "success"}


# ── Admin Feedback ──
ADMIN_USERS = ["gonza"]

@router.get("/admin/feedback")
def get_all_feedback(current_user: str = Depends(get_current_user)):
    if current_user.lower() not in ADMIN_USERS:
        return {"status": "error", "detail": "No autorizado"}
    from core.database_sqlite import obtener_feedback_admin
    return {"status": "success", "feedback": obtener_feedback_admin()}


class AdminReply(BaseModel):
    feedback_id: int
    reply: str

@router.post("/admin/feedback/reply")
def reply_to_feedback(req: AdminReply, current_user: str = Depends(get_current_user)):
    if current_user.lower() not in ADMIN_USERS:
        return {"status": "error", "detail": "No autorizado"}
    from core.database_sqlite import responder_feedback
    user = responder_feedback(req.feedback_id, req.reply)
    if user is None:
        return {"status": "error", "detail": "Feedback no encontrado"}
    return {"status": "success", "user_notified": user}


@router.get("/admin/ai-stats")
def get_ai_stats(periodo: str = "hoy", current_user: str = Depends(get_current_user)):
    """
    Estadísticas de uso de Gemini.
    periodo: 'hoy' | 'semana' | 'mes' | 'todo'
    """
    if current_user.lower() not in ADMIN_USERS:
        return {"status": "error", "detail": "No autorizado"}
    from core.ai import get_ai_stats_hoy
    import sqlite3, os
    from datetime import datetime, timedelta

    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "..", "data", "vortice_elite.db")
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            hoy = datetime.now().strftime("%Y-%m-%d")

            if periodo == "hoy":
                filtro = f"{hoy}%"
                label_sql = "strftime('%H:00', ts)"
            elif periodo == "semana":
                desde = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                filtro = f"{desde}%"  # no usamos LIKE aquí
                label_sql = "strftime('%Y-%m-%d', ts)"
            elif periodo == "mes":
                desde = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                filtro = f"{desde}%"
                label_sql = "strftime('%Y-%m-%d', ts)"
            else:  # todo
                filtro = "%"
                label_sql = "strftime('%Y-%m', ts)"

            # WHERE dinámico
            where = "ts LIKE ?" if periodo == "hoy" else "ts >= ?"
            param = filtro if periodo == "hoy" else filtro.rstrip("%")

            total = conn.execute(
                f"SELECT COUNT(*) as calls, COALESCE(SUM(tokens_estimados),0) as tokens, "
                f"COALESCE(SUM(CASE WHEN exito=0 THEN 1 ELSE 0 END),0) as errores "
                f"FROM ai_calls WHERE {where}", (param,)
            ).fetchone()

            por_usuario = conn.execute(
                f"SELECT usuario, COUNT(*) as calls, COALESCE(SUM(tokens_estimados),0) as tokens "
                f"FROM ai_calls WHERE {where} GROUP BY usuario ORDER BY calls DESC",
                (param,)
            ).fetchall()

            por_modelo = conn.execute(
                f"SELECT modelo, COUNT(*) as calls, COALESCE(SUM(tokens_estimados),0) as tokens "
                f"FROM ai_calls WHERE {where} GROUP BY modelo ORDER BY calls DESC",
                (param,)
            ).fetchall()

            timeline = conn.execute(
                f"SELECT {label_sql} as label, COUNT(*) as calls, COALESCE(SUM(tokens_estimados),0) as tokens "
                f"FROM ai_calls WHERE {where} GROUP BY label ORDER BY label ASC",
                (param,)
            ).fetchall()

            ultimas = conn.execute(
                f"SELECT ts, modelo, usuario, tokens_estimados, exito FROM ai_calls "
                f"WHERE {where} ORDER BY id DESC LIMIT 20",
                (param,)
            ).fetchall()

            return {
                "status": "success",
                "periodo": periodo,
                "resumen": {
                    "total_calls": total["calls"],
                    "total_tokens": total["tokens"],
                    "errores": total["errores"],
                    "tasa_exito": f"{((total['calls'] - total['errores']) / max(total['calls'], 1)) * 100:.1f}%"
                },
                "por_usuario": [dict(r) for r in por_usuario],
                "por_modelo": [dict(r) for r in por_modelo],
                "timeline": [dict(r) for r in timeline],
                "ultimas_llamadas": [dict(r) for r in ultimas]
            }
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ── Analytics ──
class AnalyticsEvent(BaseModel):
    event: str
    user: Optional[str] = None
    data: Optional[dict] = None

# Color palette for users (ANSI 256-color)
_USER_COLORS = [
    "\033[38;5;87m",   # cyan
    "\033[38;5;213m",  # pink
    "\033[38;5;118m",  # green
    "\033[38;5;208m",  # orange
    "\033[38;5;141m",  # purple
    "\033[38;5;226m",  # yellow
    "\033[38;5;196m",  # red
    "\033[38;5;51m",   # bright cyan
]
_user_color_map: dict[str, str] = {}

_EVENT_ICONS = {
    "login": ">>", "logout": "<<", "tab": "--",
    "like": "<3", "comment": "#", "follow": "+",
    "admin_reply": "!!", "post": "**",
}
R = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

def _color_for(user: str) -> str:
    key = user.lower()
    if key not in _user_color_map:
        _user_color_map[key] = _USER_COLORS[len(_user_color_map) % len(_USER_COLORS)]
    return _user_color_map[key]

@router.post("/analytics/event")
def track_event(ev: AnalyticsEvent, request: Request):
    ts = datetime.now().strftime("%H:%M:%S")
    user = ev.user or "anon"
    uc = _color_for(user)
    icon = _EVENT_ICONS.get(ev.event, "  ")
    extra = ""
    if ev.data:
        extra = f" {DIM}| " + " ".join(f"{k}={v}" for k, v in ev.data.items()) + R
    print(f"{DIM}{ts}{R}  {icon}  {uc}{BOLD}{user:>12}{R}  \033[33m{ev.event}{R}{extra}")
    return {"status": "ok"}
