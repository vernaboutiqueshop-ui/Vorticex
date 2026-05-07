from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import timedelta, datetime
import re
from collections import defaultdict

from core.database import obtener_perfil, guardar_perfil, verificar_password, obtener_password_hash
from core.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiter simple en memoria: máx 10 intentos por IP en 60 segundos
_login_attempts: dict = defaultdict(list)

def _check_rate_limit(ip: str):
    now = datetime.utcnow()
    window = [t for t in _login_attempts[ip] if (now - t).seconds < 60]
    _login_attempts[ip] = window
    if len(window) >= 10:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Esperá 1 minuto.")
    _login_attempts[ip].append(now)


class RegisterRequest(BaseModel):
    nombre: str
    password: str
    edad: int
    peso: float
    altura: Optional[float] = 0
    meta: str
    deporte: str = ""
    deportes: List[str] = []
    profile_pic: Optional[str] = None

    @field_validator('nombre')
    @classmethod
    def validar_nombre(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError('El nombre debe tener al menos 3 caracteres')
        if len(v) > 30:
            raise ValueError('El nombre no puede superar 30 caracteres')
        if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9._-]+$', v):
            raise ValueError('El nombre solo puede contener letras, números, puntos, guiones y guiones bajos')
        return v

    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if len(v) < 4:
            raise ValueError('La contraseña debe tener al menos 4 caracteres')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "nombre": "Gonza",
                "password": "test1234",
                "edad": 28,
                "peso": 80.0,
                "altura": 178.0,
                "meta": "Ganar masa muscular",
                "deportes": ["Musculación", "Running"]
            }
        }
    }


@router.post("/register")
def register_user(req: RegisterRequest):
    existing = obtener_perfil(req.nombre)
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
    deportes_str = ", ".join(req.deportes) if req.deportes else req.deporte
    data = {
        "descripcion": f"Edad: {req.edad}, Peso: {req.peso}kg, Altura: {req.altura}cm. Meta: {req.meta}. Deportes: {deportes_str}",
        "detalle": "Onboarding completado",
        "objetivo_ia": req.meta,
        "peso": req.peso,
        "password": req.password
    }
    guardar_perfil(req.nombre, data)
    # Save height and profile pic if provided
    if req.altura > 0 or req.profile_pic:
        from core.database_sqlite import get_conn
        with get_conn() as conn:
            cur = conn.cursor()
            if req.altura > 0:
                cur.execute("UPDATE users SET height = ? WHERE LOWER(name) = LOWER(?)", (req.altura, req.nombre))
            if req.profile_pic:
                cur.execute("UPDATE users SET profile_pic = ? WHERE LOWER(name) = LOWER(?)", (req.profile_pic, req.nombre))
            conn.commit()
    access_token = create_access_token(data={"sub": req.nombre})
    return {"access_token": access_token, "token_type": "bearer", "status": "success"}


@router.post("/token")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    nombres_a_probar = [form_data.username, form_data.username.capitalize(), form_data.username.lower()]
    user = None
    final_username = form_data.username

    for nombre in nombres_a_probar:
        user = obtener_perfil(nombre)
        if user:
            final_username = nombre
            break

    if not user:
        return {"error": "Credenciales inválidas"}

    stored_hash = obtener_password_hash(final_username)
    if not verificar_password(form_data.password, stored_hash):
        return {"error": "Credenciales inválidas"}

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": final_username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "status": "success"}


@router.get("/recover")
def recover_password(username: str):
    return {"error": "La recuperación por contraseña está deshabilitada. Contactá al administrador."}
