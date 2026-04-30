from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
from datetime import timedelta

from core.database import obtener_perfil, guardar_perfil, verificar_password, obtener_password_hash
from core.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])


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


@router.post("/register")
def register_user(req: RegisterRequest):
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
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
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
