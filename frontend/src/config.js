// Configuración dinámica de la API vinculada a Firebase Discovery
let dynamicAPI = import.meta.env.PROD 
  ? 'https://vortice-fallback.vercel.app' // Fallback inicial
  : 'http://localhost:8000';

export const setDynamicAPI = (url) => {
  if (url && url.startsWith('http')) {
    console.log('[VORTICE] Actualizando dirección de la API:', url);
    dynamicAPI = url;
  }
};

export const getAPI = () => dynamicAPI;

/**
 * Exportamos API como un objeto que siempre resuelve a la URL actual.
 * Esto corrige el bug donde los componentes se quedaban con la URL vieja.
 */
export const API = {
  toString: () => dynamicAPI,
  valueOf: () => dynamicAPI
};

// Para usar en strings directamente: `${API}/ruta`
// Nota: En algunos lugares se usa `${API}`, JS llamará a toString() automáticamente.
