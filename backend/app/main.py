# app/main.py
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import httpx
import os
import sqlite3
import json

# --- CONFIGURACIÓN DEL CEREBRO (DATA CORE) ---
DB_PATH = os.path.join(os.getcwd(), "data", "vortice_elite.db")
GIF_CACHE_DIR = os.path.join(os.getcwd(), "data", "exercises", "gifs")
os.makedirs(GIF_CACHE_DIR, exist_ok=True)

app = FastAPI(title="Vórtice Digital Brain", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def get_db_stats():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM exercises")
        e_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM users")
        u_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM nutrition_knowledge")
        k_count = cur.fetchone()[0]
        conn.close()
        return {"exercises": e_count, "users": u_count, "knowledge": k_count, "status": "ONLINE"}
    except Exception as e:
        return {"status": "OFFLINE", "error": str(e)}

@app.get("/", response_class=HTMLResponse)
async def brain_dashboard():
    stats = get_db_stats()
    
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Vórtice Brain</title>
        <style>
            body {{ 
                margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
                background: #ffffff; color: #000000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
            }}
            .core {{ 
                text-align: center; max-width: 600px; width: 100%;
            }}
            .label {{ 
                font-size: 10px; font-weight: 800; letter-spacing: 0.2em; color: #999; text-transform: uppercase; margin-bottom: 8px;
            }}
            .value {{ 
                font-size: 48px; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 40px;
            }}
            .grid {{ 
                display: flex; justify-content: space-around; border-top: 1px solid #eee; padding-top: 40px;
            }}
            .item {{ text-align: center; }}
            .item-val {{ font-size: 20px; font-weight: 700; color: #333; }}
            .status {{ 
                display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 8px;
            }}
            a {{ 
                display: inline-block; margin-top: 60px; font-size: 11px; font-weight: 700; text-decoration: none; color: #6366f1; border: 1px solid #6366f1; padding: 10px 20px; border-radius: 100px; transition: all 0.2s;
            }}
            a:hover {{ background: #6366f1; color: #fff; }}
        </style>
    </head>
    <body>
        <div class="core">
            <div class="label">Vórtice Digital Brain Core</div>
            <div class="value">
                <span class="status"></span>{stats.get('status', 'OFFLINE')}
            </div>
            
            <div class="grid">
                <div class="item">
                    <div class="label">Ejercicios</div>
                    <div class="item-val">{stats.get('exercises', 0)}</div>
                </div>
                <div class="item">
                    <div class="label">Usuarios</div>
                    <div class="item-val">{stats.get('users', 0)}</div>
                </div>
                <div class="item">
                    <div class="label">Memoria</div>
                    <div class="item-val">{stats.get('knowledge', 0)}</div>
                </div>
            </div>
            
            <a href="/docs">Open System API</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/api/health")
async def health():
    return get_db_stats()

# --- PROXY DE IMÁGENES ---
@app.get("/proxy/image")
async def image_proxy(exercise_id: str):
    # Lógica simplificada de proxy para el Cerebro
    path = os.path.join(GIF_CACHE_DIR, f"{{exercise_id}}.gif")
    if os.path.exists(path):
        with open(path, "rb") as f: return Response(content=f.read(), media_type="image/gif")
    return Response(status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
