import sqlite3
import random
from datetime import datetime, timedelta

def seed_history():
    print("Conectando a base de datos para sembrar historial...")
    conn = sqlite3.connect('data/vortice_elite.db')
    cur = conn.cursor()
    
    # 1. Obtener usuario (asumimos perfil Gonzalo)
    perfil = "Gonzalo"
    cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
    user = cur.fetchone()
    if not user:
        print("Usuario no encontrado.")
        return
    uid = user[0]
    
    # 2. Obtener algunos ejercicios de la BD para armar las rutinas
    cur.execute("SELECT id, target FROM exercises LIMIT 50")
    all_ex = cur.fetchall()
    
    # Separar por targets
    chest_ex = [e for e in all_ex if 'Pectorals' in str(e[1])]
    back_ex = [e for e in all_ex if 'Lats' in str(e[1]) or 'Back' in str(e[1])]
    legs_ex = [e for e in all_ex if 'Quads' in str(e[1]) or 'Hamstrings' in str(e[1]) or 'Glutes' in str(e[1])]
    abs_ex = [e for e in all_ex if 'Abs' in str(e[1])]
    cardio_ex = [e for e in all_ex if 'Cardio' in str(e[1])]
    
    # Si no hay suficientes, agarramos los primeros
    if not chest_ex: chest_ex = all_ex[0:5]
    if not back_ex: back_ex = all_ex[5:10]
    if not legs_ex: legs_ex = all_ex[10:15]
    if not abs_ex: abs_ex = all_ex[15:20]
    if not cardio_ex: cardio_ex = all_ex[20:25]
    
    # 3. Crear 5 Rutinas
    rutinas_info = [
        {"name": "Tren Superior", "ex": (chest_ex + back_ex)[:6]},
        {"name": "Tren Inferior", "ex": legs_ex[:6]},
        {"name": "Core / Abs", "ex": abs_ex[:6]},
        {"name": "Cardio Hit", "ex": cardio_ex[:6]},
        {"name": "Full Body Elite", "ex": (chest_ex[:2] + back_ex[:2] + legs_ex[:2])}
    ]
    
    created_routines = []
    
    for rt in rutinas_info:
        cur.execute("INSERT INTO routines (user_id, name, active) VALUES (?, ?, 1)", (uid, rt['name']))
        rid = cur.lastrowid
        created_routines.append({"id": rid, "name": rt['name'], "exercises": rt['ex']})
        
        for idx, ex in enumerate(rt['ex']):
            cur.execute("INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, order_index) VALUES (?, ?, 3, '12', ?)", (rid, ex[0], idx))
            
    print(f"5 rutinas creadas: {[r['name'] for r in created_routines]}")
    
    # 4. Generar 30 días de historial (sin sábados ni domingos)
    hoy = datetime.now()
    dias_sembrados = 0
    volumen_acumulado = 0
    
    for i in range(40, -1, -1):
        fecha = hoy - timedelta(days=i)
        if fecha.weekday() >= 5: # 5 es Sábado, 6 es Domingo
            continue
            
        rutina = random.choice(created_routines)
        duracion_minutos = random.randint(55, 80) # 55 a 80 minutos
        duracion_segundos = duracion_minutos * 60
        
        # Guardar GymSession (para promedios)
        cur.execute("INSERT INTO activity_logs (user_id, type, val1, val2, description, timestamp) VALUES (?, 'GymSession', ?, ?, ?, ?)", 
                    (uid, duracion_segundos, rutina['id'], f"Completó {rutina['name']}", fecha.strftime('%Y-%m-%d 18:00:00')))
        
        # Guardar Sets
        for ex in rutina['exercises']:
            for s in range(3):
                kg = random.randint(10, 80)
                reps = random.randint(8, 15)
                volumen_acumulado += (kg * reps)
                val1 = f"{ex[0]}|{kg}|{reps}"
                cur.execute("INSERT INTO activity_logs (user_id, type, val1, val2, timestamp) VALUES (?, 'Gym', ?, ?, ?)", 
                            (uid, val1, ex[1], fecha.strftime('%Y-%m-%d 18:00:00')))
                            
        dias_sembrados += 1
        if dias_sembrados >= 30:
            break
            
    # Dar nivel y exp realistas
    exp_ganada = int(volumen_acumulado / 10)
    nivel = max(1, int(exp_ganada / 1000) + 1)
    cur.execute("UPDATE users SET exp = ?, level = ? WHERE id = ?", (exp_ganada, nivel, uid))
    
    conn.commit()
    print(f"Sembrados {dias_sembrados} días de historial. EXP total: {exp_ganada}, Nivel: {nivel}")

if __name__ == "__main__":
    seed_history()
