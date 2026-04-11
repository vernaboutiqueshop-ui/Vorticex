# Ejercicios Local Mirror - Ecosistema Fitness

Este proyecto es un espejo local para los datos de **ExerciseDB** (RapidAPI) integrado en un ecosistema relacional para la gestión de alumnos y nutrición.

## Arquitectura
- **Backend**: Python 3 con FastAPI.
- **Base de Datos**: SQLite (`fitness_school.db`).
- **Data Mirroring**: Sincronización masiva (1500 ejercicios) en una sola llamada.
- **Dashboard**: Interfaz profesional para visualizar tablas y relaciones.

## Estructura de Archivos
- `main.py`: Orquestador de sincronización.
- `api_client.py`: Cliente para conectar con ExerciseDB (RapidAPI).
- `db_manager.py`: Gestión de base de datos y UPSERT.
- `db_schema.py`: Definición del esquema relacional (SQL).
- `seeder.py`: Generador de datos ejemplo (Alumnos y Comidas).
- `api_server.py`: Servidor que expone los datos al Dashboard.
- `requirements.txt`: Dependencias del proyecto.

## Instalación y Uso

1. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar API Key**:
   Edita `api_client.py` y coloca tu `X-RapidAPI-Key` en la variable `RAPIDAPI_KEY`.

3. **Sincronizar Datos**:
   ```bash
   python main.py
   ```

4. **Poblar datos de ejemplo**:
   ```bash
   python seeder.py
   ```

5. **Iniciar Dashboard / API**:
   ```bash
   python api_server.py
   ```
   Accede a `http://127.0.0.1:8000/exercises` para ver los datos JSON.

## Dashboard Web
Próximamente... (Desarrollando la interfaz React).
