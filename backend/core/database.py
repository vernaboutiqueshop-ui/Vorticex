# backend/core/database.py
from core.config import DATABASE_MODE

if DATABASE_MODE == "cloud":
    print("[DATABASE] Usando MODO CLOUD (Firebase)")
    from core.database_firebase import (
        obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
        consultar_datos, guardar_log_set, guardar_evento,
        obtener_alacena, guardar_en_alacena, eliminar_de_alacena_perfil,
        obtener_entrenamientos_resumen, obtener_eventos_timeline, obtener_macros_hoy,
        obtener_ayuno, actualizar_ayuno,
        guardar_rutina, obtener_rutinas, eliminar_rutina_perfil,
        obtener_comidas_hoy, eliminar_evento_perfil,
        obtener_perfil, guardar_perfil, listar_perfiles, obtener_memoria_perfil
    )
else:
    print("[DATABASE] Usando MODO LOCAL (SQLite)")
    from core.database_sqlite import (
        obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
        consultar_datos, guardar_log_set, guardar_evento,
        obtener_alacena, guardar_en_alacena, eliminar_de_alacena_perfil,
        obtener_entrenamientos_resumen, obtener_eventos_timeline, obtener_macros_hoy,
        obtener_ayuno, actualizar_ayuno,
        guardar_rutina, obtener_rutinas, eliminar_rutina_perfil,
        obtener_comidas_hoy, eliminar_evento_perfil,
        obtener_perfil, guardar_perfil, listar_perfiles, obtener_memoria_perfil
    )
