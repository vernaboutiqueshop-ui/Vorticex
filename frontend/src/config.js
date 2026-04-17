// Configuración dinámica de la API vinculada a Firebase Discovery
let dynamicAPI = import.meta.env.PROD 
  ? 'https://vortice-fallback.vercel.app' // Fallback inicial
  : 'http://localhost:8000';

export const setDynamicAPI = (url) => {
  dynamicAPI = url;
};

export const getAPI = () => dynamicAPI;

// Exportamos un objeto proxy o directo (nota: esto puede requerir que los componentes llamen a getAPI())
export const API = dynamicAPI; 
