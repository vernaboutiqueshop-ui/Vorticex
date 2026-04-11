# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Pydantic buscará automáticamente estas variables en el entorno o en el archivo .env
    PROJECT_NAME: str = "Elite School Fitness & Nutrition"
    DATABASE_NAME: str = "fitness_school.db"
    
    # API Keys (Pydantic las cargará desde RAPIDAPI_KEY en el .env)
    RAPIDAPI_KEY: Optional[str] = None
    
    # API Hosts
    EXERCISEDB_HOST: str = "exercisedb.p.rapidapi.com"
    EXERCISEDB_URL: str = "https://exercisedb.p.rapidapi.com/exercises"
    
    # Rutas de datos
    USDA_DATA_DIR: str = "USDA"

    # Configuración de carga de entorno
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
