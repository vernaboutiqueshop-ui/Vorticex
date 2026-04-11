# app/db/schemas.py
# Definición del esquema de base de datos relacional y de alto rendimiento (FTS5).

# Habilitar claves foráneas en SQLite
PRAGMA_FOREIGN_KEYS = "PRAGMA foreign_keys = ON;"

# --- TABLAS DE EJERCICIOS ---

CREATE_EXERCISES_TABLE = """
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    body_part TEXT,
    equipment TEXT,
    target TEXT,
    secondary_muscles TEXT,
    instructions TEXT,
    gif_url TEXT,
    difficulty_level TEXT -- Calculado: Easy, Medium, Hard
);
"""

# Tabla Virtual para Búsqueda de Texto Completo (FTS5)
CREATE_EXERCISES_FTS_TABLE = """
CREATE VIRTUAL TABLE IF NOT EXISTS exercises_fts USING fts5(
    id UNINDEXED,
    name,
    body_part,
    equipment,
    target,
    content='exercises',
    content_rowid='rowid'
);
"""

# triggers para mantener FTS5 sincronizado
CREATE_EXERCISES_AI_TRIGGER = """
CREATE TRIGGER IF NOT EXISTS exercises_ai AFTER INSERT ON exercises BEGIN
  INSERT INTO exercises_fts(rowid, id, name, body_part, equipment, target)
  VALUES (new.rowid, new.id, new.name, new.body_part, new.equipment, new.target);
END;
"""

# --- TABLAS DE NUTRICIÓN (USDA SR Legacy) ---

CREATE_USDA_FOODS_TABLE = """
CREATE TABLE IF NOT EXISTS usda_foods (
    fdc_id INTEGER PRIMARY KEY,
    description TEXT NOT NULL
);
"""

CREATE_USDA_NUTRIENTS_TABLE = """
CREATE TABLE IF NOT EXISTS usda_nutrients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    unit_name TEXT
);
"""

CREATE_USDA_FOOD_NUTRIENTS_TABLE = """
CREATE TABLE IF NOT EXISTS usda_food_nutrients (
    fdc_id INTEGER,
    nutrient_id INTEGER,
    amount REAL,
    PRIMARY KEY (fdc_id, nutrient_id),
    FOREIGN KEY (fdc_id) REFERENCES usda_foods(fdc_id),
    FOREIGN KEY (nutrient_id) REFERENCES usda_nutrients(id)
);
"""

# Cache para resultados de API externa (Open Food Facts)
CREATE_NUTRITION_CACHE_TABLE = """
CREATE TABLE IF NOT EXISTS nutrition_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    calories REAL,
    protein REAL,
    carbs REAL,
    fats REAL,
    source TEXT DEFAULT 'Open Food Facts'
);
"""

# --- TABLAS DE USUARIOS Y ANALÍTICA ---

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    weight REAL,
    height REAL,
    goal TEXT
);
"""

CREATE_ACTIVITY_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    exercise_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sets INTEGER,
    reps INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
"""

CREATE_MEAL_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    food_name TEXT,
    calories REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""

SCHEMA_STATEMENTS = [
    PRAGMA_FOREIGN_KEYS,
    CREATE_EXERCISES_TABLE,
    CREATE_EXERCISES_FTS_TABLE,
    CREATE_EXERCISES_AI_TRIGGER,
    CREATE_USDA_FOODS_TABLE,
    CREATE_USDA_NUTRIENTS_TABLE,
    CREATE_USDA_FOOD_NUTRIENTS_TABLE,
    CREATE_NUTRITION_CACHE_TABLE,
    CREATE_USERS_TABLE,
    CREATE_ACTIVITY_LOGS_TABLE,
    CREATE_MEAL_LOGS_TABLE
]
