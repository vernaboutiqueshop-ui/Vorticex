import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routers import auth, perfiles, gym, nutricion, chat, general, system
from core.database_sqlite import obtener_catalogo_completo


async def lifespan(app: FastAPI):
    print("[VORTICE] Iniciando Vórtice Health API (All-Local Mode)")
    os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
    try:
        from scripts.init_final_db import init_final_db
        init_final_db()
    except Exception as e:
        print(f"[VORTICE] Error inicializando DB: {e}")
    yield


tags_metadata = [
    {"name": "auth", "description": "🔐 Registro y login. **Empezá acá** — devuelve el JWT que necesitás para todo lo demás."},
    {"name": "perfiles", "description": "👤 Datos del usuario: peso, altura, avatar, nivel, EXP, género."},
    {"name": "gym", "description": "💪 Catálogo de +1300 ejercicios, rutinas personalizadas, historial de workouts y récords personales."},
    {"name": "nutricion", "description": "🥗 Búsqueda híbrida de alimentos (cache + Open Food Facts + Gemini IA), registro de comidas por gramos, ayuno intermitente, metas diarias, hidratación, historial semanal."},
    {"name": "chat", "description": "🤖 Chat con el entrenador IA (Gemini Cloud + fallback local). Entiende lenguaje natural."},
    {"name": "general", "description": "📊 Deportes, comunidad, estadísticas, alacena, recetas IA."},
]

app = FastAPI(
    title="Vórtice Elite API",
    version="4.0.0",
    openapi_tags=tags_metadata,
    description="""
## Vórtice Elite — API de Entrenamiento Personal con IA

### 🚀 Cómo empezar en 3 pasos

**1. Registrarse** → `POST /api/auth/register`
```json
{
  "nombre": "Gonza",
  "password": "test1234",
  "edad": 28,
  "peso": 80.0,
  "altura": 178.0,
  "meta": "Ganar masa muscular",
  "deportes": ["Musculación"]
}
```

**2. Obtener token** → `POST /api/auth/token`
- En Swagger: usar el botón **Authorize 🔓** arriba a la derecha
- `username`: tu nombre, `password`: tu contraseña

**3. Usar los endpoints** → Todos requieren `Authorization: Bearer <token>` excepto `/api/auth/*`

---

### 📋 Funcionalidades principales

| Área | Endpoints clave |
|------|----------------|
| 🥗 Nutrición | `POST /api/nutricion/buscar` · `POST /api/nutricion/analizar-texto` |
| 💧 Agua | `GET /api/nutricion/agua` · `POST /api/nutricion/agua` |
| 🎯 Metas | `GET /api/nutricion/metas` · `POST /api/nutricion/metas` |
| 💪 Gym | `GET /api/gym/ejercicios` · `POST /api/gym/log` |
| 🤖 Chat IA | `POST /api/chat` |
| 📊 Historial | `GET /api/nutricion/historial` · `GET /api/graficos/timeline` |

---

### 🔍 Búsqueda de alimentos — Pipeline inteligente
1. **⚡ Cache local SQLite** — instantáneo
2. **🌍 Open Food Facts** — base de datos global real
3. **🤖 Gemini IA** — fallback con estimación inteligente

Todos los macros se normalizan a **100g** antes de guardarse.
""",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS CONFIGURATION (MUST BE AT THE TOP) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- COMPRESSION (GZIP) ---
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

# Montar GIFs estáticos
base_path = os.path.dirname(os.path.abspath(__file__))
gifs_path = os.path.join(base_path, "data", "exercises", "gifs")

if os.path.exists(gifs_path):
    app.mount("/gifs", StaticFiles(directory=gifs_path), name="gifs")
    app.mount("/exercises/gifs", StaticFiles(directory=gifs_path), name="exercises_gifs")
else:
    print(f"[VORTICE] ADVERTENCIA: Carpeta de GIFs no encontrada en {gifs_path}")

# Registrar routers
app.include_router(auth.router)
app.include_router(perfiles.router)
app.include_router(gym.router)
app.include_router(nutricion.router)
app.include_router(chat.router)
app.include_router(general.router)
app.include_router(system.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Vórtice v4.0 Elite Running"}


@app.get("/api/ping")
def ping():
    return {"version": "4.0", "db": "sqlite"}


# ============================================================
# ADMIN: Vista HTML del catálogo (sin auth, uso interno)
# ============================================================
@app.get("/view/exercises", response_class=HTMLResponse)
def view_exercises_html():
    try:
        rows = obtener_catalogo_completo()
        html_content = """
        <html>
        <head>
            <title>Catálogo de Ejercicios - Vórtice Elite</title>
            <style>
                body { 
                    font-family: system-ui, sans-serif; background: #0f172a; color: white; 
                    margin: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden;
                }
                .app-header { 
                    flex: 0 0 auto; background: #0f172a; padding: 20px;
                    border-bottom: 2px solid #1e293b; z-index: 100;
                }
                .table-container { flex: 1 1 auto; overflow-y: auto; padding: 0 20px; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 50px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; word-wrap: break-word; }
                th:nth-child(1), td:nth-child(1) { width: 100px; } 
                th:nth-child(2), td:nth-child(2) { width: 60px; }  
                th:nth-child(3), td:nth-child(3) { width: 220px; } 
                th:nth-child(4), td:nth-child(4) { width: 180px; } 
                th:nth-child(5), td:nth-child(5) { width: 100px; } 
                th:nth-child(6), td:nth-child(6) { width: auto; }  
                th { background: #1e293b; color: #38bdf8; position: sticky; top: 0; z-index: 90; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                img { width: 80px; height: 80px; border-radius: 8px; background: white; object-fit: contain; }
                .badges { display: flex; gap: 8px; }
                .badge { background: #38bdf8; color: black; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                .badge-eq { background: #475569; color: white; }
                .difficulty { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; text-align: center; display: inline-block; width: 60px; }
                .diff-easy { background: #22c55e; color: white; }
                .diff-medium { background: #eab308; color: black; }
                .diff-hard { background: #ef4444; color: white; }
                .filters { margin: 15px 0 0 0; display: flex; gap: 10px; flex-wrap: wrap; }
                .filter-btn { background: #334155; color: #94a3b8; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; transition: 0.2s; font-weight: 600; }
                .filter-btn:hover { background: #475569; color: white; }
                .filter-btn.active { background: #38bdf8; color: #0f172a; }
            </style>
            <script>
                function filterBy(muscle, btn) {
                    const rows = document.querySelectorAll('tr.exercise-row');
                    const btns = document.querySelectorAll('.filter-btn');
                    const counterSpan = document.getElementById('res-count');
                    btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const muscleLower = muscle.toLowerCase();
                    let count = 0;
                    rows.forEach(row => {
                        if (muscle === 'all') { row.style.display = ''; count++; }
                        else {
                            const bodyPart = (row.getAttribute('data-muscle') || '').toLowerCase();
                            const target = (row.getAttribute('data-target') || '').toLowerCase();
                            const isMatch = bodyPart.includes(muscleLower) || target.includes(muscleLower) ||
                                (muscleLower === 'brazos' && (target.includes('bicep') || target.includes('tricep') || target.includes('arm'))) ||
                                (muscleLower === 'piernas' && (target.includes('quad') || target.includes('hamstring') || target.includes('glute') || target.includes('calf'))) ||
                                (muscleLower === 'pecho' && target.includes('pectoral')) ||
                                (muscleLower === 'abdominales' && (target.includes('abs') || target.includes('core')));
                            if (isMatch) { row.style.display = ''; count++; } else { row.style.display = 'none'; }
                        }
                    });
                    counterSpan.innerText = count;
                }
                function sortTable(n) {
                    const table = document.getElementById("exerciseTable");
                    const tbody = table.querySelector("tbody");
                    const rows = Array.from(tbody.querySelectorAll("tr"));
                    const header = table.querySelectorAll("th")[n];
                    const isAsc = !header.classList.contains("asc");
                    table.querySelectorAll("th").forEach(th => th.classList.remove("asc", "desc"));
                    header.classList.add(isAsc ? "asc" : "desc");
                    const weights = { "easy": 1, "medium": 2, "hard": 3 };
                    rows.sort((rowA, rowB) => {
                        let valA = rowA.cells[n].innerText.trim().toLowerCase();
                        let valB = rowB.cells[n].innerText.trim().toLowerCase();
                        if (n === 4) { valA = weights[valA] || 0; valB = weights[valB] || 0; }
                        if (valA < valB) return isAsc ? -1 : 1;
                        if (valA > valB) return isAsc ? 1 : -1;
                        return 0;
                    });
                    rows.forEach(row => tbody.appendChild(row));
                }
            </script>
        </head>
        <body>
            <div class="app-header">
                <h1 style="margin:0">Vórtice Admin <span>(Mostrando: <span id="res-count">{count}</span>)</span></h1>
                <div class="filters">
                    <button class="filter-btn active" onclick="filterBy('all', this)">Todos</button>
                    <button class="filter-btn" onclick="filterBy('pecho', this)">Pecho</button>
                    <button class="filter-btn" onclick="filterBy('espalda', this)">Espalda</button>
                    <button class="filter-btn" onclick="filterBy('brazos', this)">Brazos</button>
                    <button class="filter-btn" onclick="filterBy('piernas', this)">Piernas</button>
                    <button class="filter-btn" onclick="filterBy('abdominales', this)">Abdominales</button>
                    <button class="filter-btn" onclick="filterBy('hombros', this)">Hombros</button>
                </div>
            </div>
            <div class="table-container">
                <table id="exerciseTable">
                    <thead>
                        <tr>
                            <th>GIF</th>
                            <th onclick="sortTable(1)" style="cursor:pointer">ID</th>
                            <th onclick="sortTable(2)" style="cursor:pointer">Nombre</th>
                            <th onclick="sortTable(3)" style="cursor:pointer">Músculo</th>
                            <th onclick="sortTable(4)" style="cursor:pointer">Dificultad</th>
                            <th>Instrucciones</th>
                        </tr>
                    </thead>
                    <tbody>
        """.replace("{count}", str(len(rows)))

        for r in rows:
            insts = "<br>".join([f"- {i}" for i in r.get('instrucciones_es', [])[:2]])
            html_content += f"""
                <tr class="exercise-row" data-muscle="{r.get('body_part')}" data-target="{r.get('target')}">
                    <td><img src="{r.get('gif_url')}" alt="GIF"/></td>
                    <td><small>#{r['id_ejercicio']}</small></td>
                    <td><strong>{r['nombre_es']}</strong></td>
                    <td>
                        <div class="badges">
                            <span class="badge">{r.get('body_part')}</span>
                            <span class="badge badge-eq">{r.get('target')}</span>
                        </div>
                    </td>
                    <td>
                        <span class="difficulty diff-{r.get('difficulty_level', 'Medium').lower()}">
                            {r.get('difficulty_level', 'Medium')}
                        </span>
                    </td>
                    <td><small>{insts}...</small></td>
                </tr>
            """

        html_content += "</tbody></table></div></body></html>"
        return html_content
    except Exception as e:
        import traceback
        print(f"[ERROR] {traceback.format_exc()}")
        return f"<html><body><h1>Error al cargar</h1><pre>{str(e)}</pre></body></html>"


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[VORTICE] Iniciando en puerto {port} con AUTO-RELOAD activado...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
