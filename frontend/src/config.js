// Configuración global de la API
// En desarrollo usa localhost, en producción usa rutas relativas para Vercel Serverless
const isProd = import.meta.env.PROD;
const API_URL = isProd ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

export default API_URL;
