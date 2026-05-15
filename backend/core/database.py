# backend/core/database.py
# Reducido a solo SQLite para limpieza industrial del proyecto
print("[DATABASE] Usando MODO LOCAL (SQLite) - Cimientos de Grado Elite")

from core.database_sqlite import (
    obtener_historial_chat, guardar_mensaje, borrar_historial_chat,
    consultar_datos, guardar_log_set, guardar_evento,
    obtener_alacena, guardar_en_alacena, eliminar_de_alacena_perfil,
    obtener_entrenamientos_resumen, obtener_eventos_timeline, obtener_macros_hoy,
    obtener_ayuno, actualizar_ayuno,
    guardar_rutina, obtener_rutinas, eliminar_rutina_perfil,
    obtener_comidas_hoy, eliminar_evento_perfil,
    obtener_perfil, guardar_perfil, listar_perfiles, obtener_memoria_perfil,
    verificar_password, obtener_password_hash,
    obtener_metas_nutricion, guardar_metas_nutricion,
    obtener_agua_hoy, agregar_agua, resetear_agua,
    obtener_historial_nutricion,
    buscar_alimentos_cache, guardar_alimento_cache, obtener_alimento_por_id,
    get_preferencias_usuario, guardar_preferencias_usuario,
    obtener_comidas_fecha,
    guardar_sesion_ayuno, obtener_historial_ayuno,
    buscar_recetas_por_ingredientes, guardar_recetas_cache, validar_receta,
    guardar_en_cache_global, obtener_trending_alimentos,
)
