// Configuración global de la API
// En desarrollo usa localhost, en producción usará la URL enviada por Vercel/Render
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default API_URL;
