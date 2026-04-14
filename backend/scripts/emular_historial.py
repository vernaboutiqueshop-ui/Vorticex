import sqlite3
import datetime
import random
import os
import sys

# Ruta absoluta a la base de datos local
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'vortice_elite.db'))

def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def emular_datos_90_dias(user_name="Gonzalo"):
    print(f"Iniciando Emulacion de Datos para: {user_name}")
    print(f"Base de datos: {DB_PATH}")
    
    with _get_conn() as conn:
        cur = conn.cursor()
        
        try:
            cur.execute("ALTER TABLE activity_logs ADD COLUMN ref_id TEXT")
        except sqlite3.OperationalError:
            pass # Ya existe
        
        # 1. Obtener o crear al usuario
        cur.execute("SELECT id FROM users WHERE name = ?", (user_name,))
        user_row = cur.fetchone()
        
        if not user_row:
            print("Usuario no encontrado, deteniendo.")
            return
            
        u_id = user_row['id']
        
        # 2. Borrar historial viejo de Gym y Nutricion de este usuario (Opcional, pero bueno para resetear)
        cur.execute("DELETE FROM activity_logs WHERE user_id = ? AND (type = 'GymSet' OR type = 'Gym' OR type = 'Nutricion')", (u_id,))
        print("Limpiando actividad previa de Gym/Nutricion...")

        # 3. Configuración de progreso (Progresión Lineal)
        ejercicios_base = [
            {"id": "0025", "nombre": "Press Banca", "peso_inicial": 40, "peso_final": 75, "frecuencia_semanal": 2}, # Lunes y Jueves
            {"id": "0099", "nombre": "Sentadilla Pecho", "peso_inicial": 50, "peso_final": 95, "frecuencia_semanal": 2}, # Martes y Viernes
            {"id": "0291", "nombre": "Remo con barra", "peso_inicial": 40, "peso_final": 65, "frecuencia_semanal": 2}, # Lunes y Jueves
            {"id": "0389", "nombre": "Prensa Piernas", "peso_inicial": 80, "peso_final": 160, "frecuencia_semanal": 1}, # Martes
            {"id": "1373", "nombre": "Curl de Biceps", "peso_inicial": 10, "peso_final": 18, "frecuencia_semanal": 2}, # Lunes y Jueves
        ]

        hoy = datetime.datetime.now()
        
        print("Inyectando 90 días hacia atrás...")
        
        volumen_total_generado = 0
        sesiones_gym = 0

        # Iterar por los últimos 90 días (día 90 en el pasado hasta hoy)
        for i in range(90, -1, -1):
            dia_actual = hoy - datetime.timedelta(days=i)
            dia_semana = dia_actual.weekday() # 0 = Lunes, 6 = Domingo
            
            # Factor de Progreso Global (0.0 el primer dia, 1.0 el último día)
            progreso_factor = 1.0 - (i / 90.0) 
            
            # --- RUTINA GYM ---
            # Vamos a simular Push/Pull los Lunes(0) y Jueves(3), Piernas los Martes(1) y Viernes(4)
            ejercicios_del_dia = []
            if dia_semana in [0, 3]: # Lunes, Jueves
                ejercicios_del_dia = [e for e in ejercicios_base if e["nombre"] in ["Press Banca", "Remo con barra", "Curl de Biceps"]]
            elif dia_semana in [1, 4]: # Martes, Viernes
                ejercicios_del_dia = [e for e in ejercicios_base if e["nombre"] in ["Sentadilla Pecho", "Prensa Piernas"]]
                
            if ejercicios_del_dia:
                sesiones_gym += 1
                volumen_sesion = 0
                series_sesion = 0
                
                # Para cada ejercicio del día, generamos 4 series
                for ej in ejercicios_del_dia:
                    # Peso con ruido aleatorio para no ser tan perfecto
                    peso_real = ej["peso_inicial"] + ((ej["peso_final"] - ej["peso_inicial"]) * progreso_factor)
                    peso_real += random.uniform(-2, 2) # +- 2kg de variabilidad diaria
                    peso_real = round(peso_real, 1)
                    
                    series_del_ejercicio = 4
                    for s_num in range(1, series_del_ejercicio + 1):
                        reps = random.randint(8, 12)
                        
                        # Timestamp del Set (para darle realismo en la base, le sumamos 3 minutos por set)
                        ts_set = dia_actual + datetime.timedelta(hours=18) + datetime.timedelta(minutes=(s_num * 3))
                        
                        cur.execute("""
                            INSERT INTO activity_logs (user_id, type, description, val1, val2, ref_id, timestamp)
                            VALUES (?, 'GymSet', ?, ?, ?, ?, ?)
                        """, (u_id, f"Set {s_num} de {ej['id']}", peso_real, reps, ej['id'], ts_set.isoformat()))
                        
                        volumen_sesion += (peso_real * reps)
                        series_sesion += 1
                        volumen_total_generado += (peso_real * reps)
                        
                # Cerramos la sesión con un evento descriptivo resumen del día
                ts_fin = dia_actual + datetime.timedelta(hours=19, minutes=15)
                cur.execute("""
                    INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, val4, timestamp)
                    VALUES (?, 'Gym', ?, ?, ?, ?, ?, ?)
                """, (u_id, f"Sesión terminada: {series_sesion} series. Volumen total: {volumen_sesion:.0f}kg", 350, 0, 0, 0, ts_fin.isoformat()))


            # --- RUTINA NUTRICIÓN ---
            # Todos los dias metemos 3 comidas aprox (esto para probar saturar el gráfico sin AI limits)
            if True:
                ts_desayuno = dia_actual + datetime.timedelta(hours=9)
                ts_almuerzo = dia_actual + datetime.timedelta(hours=13)
                ts_cena = dia_actual + datetime.timedelta(hours=21)
                
                comidas = [
                    (ts_desayuno, "Huevos Revueltos (Simulación)", 300, 20, 5, 20),
                    (ts_almuerzo, "Pollo con Arroz (Simulación)", 600, 45, 60, 10),
                    (ts_cena, "Ensalada y Carne (Simulación)", 500, 35, 10, 25),
                ]
                
                for c_ts, c_desc, c_cal, c_prot, c_carb, c_gras in comidas:
                    cur.execute("""
                        INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, val4, timestamp)
                        VALUES (?, 'Nutricion', ?, ?, ?, ?, ?, ?)
                    """, (u_id, c_desc, c_cal, c_prot, c_carb, c_gras, c_ts.isoformat()))

        conn.commit()
        
    print("Emulacion completada al 100%.")
    print(f"Resumen: {sesiones_gym} sesiones de Gym generadas.")
    print(f"Volumen Total Levantado (Simulado): {volumen_total_generado:,.0f} kg.")

if __name__ == "__main__":
    emular_datos_90_dias("Gonzalo")
