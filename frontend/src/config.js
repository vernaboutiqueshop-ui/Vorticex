// Configuración dinámica de la API vinculada a Firebase Discovery
// Usamos una variable global para asegurar que el cambio sea detectado
let currentAPI = import.meta.env.PROD 
  ? 'https://vortice-fallback.vercel.app' 
  : 'http://localhost:8000';

// Exportamos un objeto que permite cambiar y obtener la URL
// Pero los componentes necesitan la URL final.
export const setDynamicAPI = (url) => {
  if (url && url.startsWith('http')) {
    console.log('[VORTICE] Discovery: Nueva URL detectada ->', url);
    currentAPI = url;
    // Forzamos actualización en el objeto exportado si fuera necesario
    API.url = url; 
  }
};

export const getAPI = () => currentAPI;

// Exportamos un objeto 'Proxy' que se comporta como un string
// Esta es la forma más robusta de que `${API}/ruta` funcione siempre.
export const API = {
  toString: () => currentAPI,
  get url() { return currentAPI; }
};

// Para debugging
if (typeof window !== 'undefined') {
  window.VORTICE_API = API;
}

export default API;
