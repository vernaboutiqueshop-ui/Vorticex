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
        if len(v) > 20:
            raise ValueError('El nombre no puede superar 20 caracteres')
        # Only letters (with accents), numbers, spaces, underscores — NO dots, slashes, dashes
        if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9_ ]+$', v):
            raise ValueError('Solo letras, números, espacios y guiones bajos')
        # Must start with a letter
        if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]', v):
            raise ValueError('El nombre debe comenzar con una letra')
        # Must have at least 2 letters (not all numbers/symbols)
        letters = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]', '', v)
        if len(letters) < 2:
            raise ValueError('El nombre debe contener al menos 2 letras')
        # Gibberish check: no more than 4 consecutive consonants
        consonant_streak = re.search(r'[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}', v)
        if consonant_streak:
            raise ValueError('El nombre no parece válido. Usá tu nombre real o un apodo')
        # Must have at least one vowel in the letters
        vowels = re.sub(r'[^aeiouáéíóúAEIOUÁÉÍÓÚ]', '', letters)
        if len(letters) >= 4 and len(vowels) == 0:
            raise ValueError('El nombre no parece válido. Usá tu nombre real o un apodo')
        return v

    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if len(v) < 6:
            raise ValueError('La contraseña debe tener al menos 6 caracteres')
        if v.lower() in ('123456', 'password', 'contraseña', '111111', 'qwerty', '123123'):
            raise ValueError('Esa contraseña es muy común, elegí una más segura')
        return v

    @field_validator('edad')
    @classmethod
    def validar_edad(cls, v):
        if v != 0 and not (10 <= v <= 100):
            raise ValueError('La edad debe estar entre 10 y 100 años')
        return v

    @field_validator('peso')
    @classmethod
    def validar_peso(cls, v):
        if v != 0 and not (30 <= v <= 300):
            raise ValueError('El peso debe estar entre 30 y 300 kg')
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


# ── Google OAuth ──
class GoogleTokenRequest(BaseModel):
    credential: str  # Google ID token from frontend

@router.post("/google")
def google_login(req: GoogleTokenRequest):
    """Verify Google ID token and create/find user. Returns JWT."""
    import os
    from core.database_sqlite import get_conn

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login no configurado en el servidor")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        idinfo = id_token.verify_oauth2_token(req.credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token de Google inválido: {str(e)[:60]}")

    email = idinfo.get("email", "")
    google_name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")
    if not email:
        raise HTTPException(status_code=400, detail="Google no devolvió un email válido")

    # Derive username from name or email
    base_name = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9_ ]', '', google_name or email.split("@")[0])[:20].strip() or "usuario"

    # Find existing user by email or by name
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        row = cur.fetchone()
        if row:
            username = row["name"]
        else:
            # Check if name taken
            username = base_name
            cur.execute("SELECT name FROM users WHERE LOWER(name) = LOWER(?)", (username,))
            if cur.fetchone():
                username = f"{base_name}_{email.split('@')[0][:8]}"
            # Create new user
            guardar_perfil(username, {
                "descripcion": f"Registrado con Google. Email: {email}",
                "objetivo_ia": "bienestar",
                "peso": 70,
                "password": f"google_{idinfo['sub']}"  # unusable password for google accounts
            })
            # Save email and picture
            with get_conn() as conn2:
                cur2 = conn2.cursor()
                cur2.execute("UPDATE users SET email=?, profile_pic=? WHERE LOWER(name)=LOWER(?)",
                             (email, picture, username))
                conn2.commit()

    access_token = create_access_token(data={"sub": username})
    return {"access_token": access_token, "token_type": "bearer", "status": "success", "username": username, "is_new": not row if 'row' in dir() else True}
