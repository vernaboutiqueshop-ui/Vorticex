import sqlite3
import os

DB_SUCIA = os.path.join("data", "vortice_cognitivo.db")
DB_OFICIAL = os.path.join("data", "entrenador.db")

def migrar():
    if not os.path.exists(DB_SUCIA):
        print("No existe la base sucia para migrar.")
        return
    
    conn_s = sqlite3.connect(DB_SUCIA)
    conn_o = sqlite3.connect(DB_OFICIAL)
    
    t_a_migrar = ['eventos', 'memoria_perfiles', 'alacena', 'historial_mensajes', 'entrenamientos_logs']
    
    for t in t_a_migrar:
        print(f"Migrando tabla {t}...")
        try:
            df_rows = conn_s.execute(f"SELECT * FROM {t}").fetchall()
            col_count = len(df_rows[0]) if df_rows else 0
            placeholders = ",".join(["?"] * col_count)
            
            if df_rows:
                # Obviamente esto asume que las estructuras coinciden
                conn_o.executemany(f"INSERT OR IGNORE INTO {t} VALUES ({placeholders})", df_rows)
                print(f"  Éxito: {len(df_rows)} registros migrados.")
        except Exception as e:
            print(f"  Error en {t}: {e}")
            
    conn_o.commit()
    conn_s.close()
    conn_o.close()
    print("\nMIGRACIÓN TÁCTICA TERMINADA. 🚀")

if __name__ == "__main__":
    migrar()
