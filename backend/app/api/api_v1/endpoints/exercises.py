# app/api/api_v1/endpoints/exercises.py
from fastapi import APIRouter, Depends, Query
from app.db.session import get_db
from app.schemas.exercise import ExerciseBase
from typing import List

router = APIRouter()

@router.get("/", response_model=List[ExerciseBase])
def search_exercises(
    q: str = Query(None, description="Término de búsqueda para FTS5"),
    db = Depends(get_db)
):
    """
    Búsqueda de ejercicios usando SQLite FTS5 para máximo rendimiento.
    """
    cursor = db.cursor()
    
    if q:
        # Búsqueda usando el operador MATCH de FTS5
        query = """
            SELECT e.* FROM exercises e
            JOIN exercises_fts f ON e.rowid = f.rowid
            WHERE exercises_fts MATCH ?
            ORDER BY rank
        """
        cursor.execute(query, (f"{q}*",))
    else:
        cursor.execute("SELECT * FROM exercises LIMIT 50")
        
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@router.get("/{exercise_id}")
def get_exercise_detail(exercise_id: str, db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,))
    row = cursor.fetchone()
    if not row:
        return {"message": "Ejercicio no encontrado"}
    return dict(row)
