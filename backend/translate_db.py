import sqlite3
from deep_translator import GoogleTranslator
import time

def translate_db():
    print("Conectando a base de datos...")
    conn = sqlite3.connect('data/vortice_elite.db')
    cur = conn.cursor()
    
    cur.execute("SELECT id, name FROM exercises WHERE nombre_en IS NULL OR nombre_en = ''")
    rows = cur.fetchall()
    
    if not rows:
        print("Todos los ejercicios ya están traducidos.")
        return
        
    print(f"Traduciendo {len(rows)} ejercicios...")
    translator = GoogleTranslator(source='es', target='en')
    
    batch_size = 20 # Pequeño para que el separador no se rompa
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        text_to_translate = " ||| ".join([r[1] for r in batch])
        try:
            translated_text = translator.translate(text_to_translate)
            translated_list = translated_text.split(" ||| ")
            
            if len(translated_list) != len(batch):
                print(f"Mismatch en batch {i}, traduciendo 1 por 1...")
                for row in batch:
                    try:
                        tr = translator.translate(row[1])
                        cur.execute("UPDATE exercises SET nombre_en = ? WHERE id = ?", (tr, row[0]))
                    except Exception as e:
                        print(f"Error con {row[1]}: {e}")
            else:
                for j, row in enumerate(batch):
                    cur.execute("UPDATE exercises SET nombre_en = ? WHERE id = ?", (translated_list[j].strip(), row[0]))
            conn.commit()
            print(f"Lote {i} a {i+batch_size} traducido y guardado.")
            time.sleep(1)
        except Exception as e:
            print(f"Error procesando batch {i}: {e}")
            
    print("Traducción completada.")

if __name__ == "__main__":
    translate_db()
