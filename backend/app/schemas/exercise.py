# app/schemas/exercise.py
from pydantic import BaseModel
from typing import Optional, List

class ExerciseBase(BaseModel):
    id: str
    name: str
    body_part: Optional[str]
    equipment: Optional[str]
    target: Optional[str]
    difficulty_level: Optional[str]
    gif_url: Optional[str]

class ExerciseDetail(ExerciseBase):
    secondary_muscles: Optional[str]
    instructions: Optional[str]

class ExerciseUpdate(BaseModel):
    name: Optional[str]
    difficulty_level: Optional[str]
