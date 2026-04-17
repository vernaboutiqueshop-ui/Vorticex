// Configuración global de la API
// En desarrollo usa localhost, en producción usa rutas relativas para el Proxy de Vercel
const isProd = import.meta.env.PROD;
export const API = isProd ? 'https://copyrights-allergy-sisters-facial.trycloudflare.com' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

export default API;
