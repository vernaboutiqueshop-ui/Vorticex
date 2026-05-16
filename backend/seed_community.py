import sqlite3
import json

conn = sqlite3.connect('data/vortice_elite.db')
cur = conn.cursor()

# Get user_id for 'gonza' or use 1
cur.execute("SELECT id FROM users WHERE LOWER(name) = 'gonza'")
u = cur.fetchone()
user_id = u[0] if u else 1

rutinas = [
    {
        "name": "Vórtice Pecho/Triceps",
        "desc": "Rutina intensa para pecho y tríceps de la comunidad Vórtice.",
        "img": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0576", 4, 10), # Prensa de pecho
            ("0577", 4, 10),
            ("0251", 4, 8),  # inmersión en el pecho
            ("0060", 3, 12), # extensión tríceps cráneo
            ("0061", 3, 12),
            ("0018", 3, 15)
        ]
    },
    {
        "name": "Vórtice Espalda/Biceps",
        "desc": "Enfocada en tirar: espalda completa y bíceps estallados.",
        "img": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0023", 4, 12), # curl bicep
            ("0139", 4, 10), # dominadas
            ("0285", 3, 12),
            ("0294", 3, 10),
            ("0315", 3, 10),
            ("1314", 4, 15)  # extension espalda
        ]
    },
    {
        "name": "Vórtice Piernas",
        "desc": "El día más duro. Piernas completas.",
        "img": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0116", 4, 8),  # peso muerto pierna recta
            ("0108", 4, 15), # elevacion pantorrilla
            ("0111", 4, 12),
            ("0400", 3, 15),
            ("0496", 4, 12), # curl piernas
            ("0582", 3, 12)
        ]
    },
    {
        "name": "Vórtice Abs/Cardio",
        "desc": "Core fuerte y resistencia cardiovascular.",
        "img": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0001", 4, 20), # abdominales
            ("0071", 4, 15),
            ("0262", 3, 20),
            ("0272", 3, 15),
            ("0507", 3, 15),
            ("0635", 3, 20)
        ]
    },
    {
        "name": "Vórtice FullBody TOP",
        "desc": "Tren superior completo (pecho, espalda, tríceps, bíceps).",
        "img": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0576", 4, 10), # pecho
            ("0139", 4, 10), # dominadas
            ("0251", 3, 12), # inmersión
            ("0023", 3, 12), # curl bicep
            ("0060", 3, 12), # tricep
            ("1314", 3, 15)  # espalda
        ]
    },
    {
        "name": "Vórtice FullBody BOT",
        "desc": "Tren inferior completo (cuádriceps, isquios, glúteos, pantorrillas).",
        "img": "https://images.unsplash.com/photo-1534367507873-d2d7e24c7f31?auto=format&fit=crop&q=80&w=400&h=300",
        "exercises": [
            ("0116", 4, 10),
            ("0108", 4, 15),
            ("0496", 4, 12),
            ("0400", 3, 15),
            ("1427", 3, 15),
            ("0012", 3, 20)
        ]
    }
]

for r in rutinas:
    cur.execute(
        "INSERT INTO routines (user_id, name, description, is_shared, image_url, active) VALUES (?, ?, ?, 1, ?, 1)",
        (user_id, r["name"], r["desc"], r["img"])
    )
    routine_id = cur.lastrowid
    
    for order, (eid, sets, reps) in enumerate(r["exercises"]):
        sets_data = json.dumps([{"type": "normal", "weight": "", "reps": str(reps)} for _ in range(sets)])
        cur.execute(
            "INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, order_index, sets_data, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, 60)",
            (routine_id, eid, sets, reps, order, sets_data)
        )

conn.commit()
print("Comunidad routines inserted!")
