from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY in ("super-secret-vortice-key", "vortice-dev-secret-key-local"):
    import secrets as _s
    SECRET_KEY = _s.token_hex(32)  # safe random fallback for dev only
    print("[AUTH] WARNING: JWT_SECRET not set in .env — using random key (tokens reset on restart)")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h (was 7 days)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception


ADMIN_USERS = {"gonza"}  # users allowed to access any profile

def require_own_profile(perfil: str, current_user: str):
    """Raise 403 if current_user tries to access another user's data.
    Admins can access any profile."""
    if current_user.lower() not in ADMIN_USERS and current_user.lower() != perfil.lower():
        raise HTTPException(
            status_code=403,
            detail="No autorizado para acceder a los datos de otro usuario"
        )
