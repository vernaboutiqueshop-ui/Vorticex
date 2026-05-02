from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import sqlite3
import os

router = APIRouter(prefix="/api", tags=["system"])

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "vortice_elite.db")

class ErrorReport(BaseModel):
    error: str
    stack: Optional[str] = None
    user: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[str] = None
    userAgent: Optional[str] = None

@router.post("/error")
def report_error(report: ErrorReport, request: Request):
    """Recibe errores del frontend para análisis."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS error_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT DEFAULT (datetime('now', 'localtime')),
                    user TEXT,
                    error TEXT,
                    stack TEXT,
                    url TEXT,
                    user_agent TEXT,
                    ip TEXT
                )
            """)
            conn.execute(
                "INSERT INTO error_reports (user, error, stack, url, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?)",
                (report.user, report.error, report.stack, report.url, 
                 report.userAgent or request.headers.get('user-agent'),
                 request.client.host if request.client else None)
            )
            conn.commit()
        return {"status": "logged"}
    except Exception as e:
        # Si falla el logging, al menos no crashear
        print(f"[ERROR REPORT FAILED] {e}")
        return {"status": "failed", "detail": str(e)}

@router.get("/health")
def health_check():
    """Endpoint para verificar que el backend está vivo."""
    return {
        "status": "ok",
        "version": "4.1.0",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "ai": "ready"
        }
    }

@router.get("/stats/errors")
def get_error_stats(user: Optional[str] = None):
    """Stats de errores (para admin)."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            hoy = datetime.now().strftime("%Y-%m-%d")
            
            # Errores de hoy
            hoy_count = conn.execute(
                "SELECT COUNT(*) FROM error_reports WHERE ts LIKE ?",
                (f"{hoy}%",)
            ).fetchone()[0]
            
            # Últimos 10 errores
            recientes = conn.execute(
                "SELECT * FROM error_reports ORDER BY ts DESC LIMIT 10"
            ).fetchall()
            
            return {
                "hoy": hoy_count,
                "ultimos": [dict(r) for r in recientes]
            }
    except Exception as e:
        return {"error": str(e)}
