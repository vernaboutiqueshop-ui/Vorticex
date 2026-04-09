const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export default async function handler(request, response) {
  const { exerciseId } = request.query;
  const resolution = request.query.resolution || '360';

  const X_RAPIDAPI_KEY = process.env.X_RAPIDAPI_KEY;
  const X_RAPIDAPI_HOST = process.env.X_RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com';

  if (!X_RAPIDAPI_KEY) {
    return response.status(500).json({ error: 'Falta configuración de API Key en Vercel' });
  }

  const url = `https://${X_RAPIDAPI_HOST}/image?exerciseId=${exerciseId}&resolution=${resolution}`;

  try {
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': X_RAPIDAPI_KEY,
        'x-rapidapi-host': X_RAPIDAPI_HOST
      }
    });

    if (!res.ok) {
      return response.status(res.status).json({ error: 'Error de la API de origen' });
    }

    // Pasamos el contenido binario (GIF) directamente al usuario
    const buffer = await res.arrayBuffer();
    response.setHeader('Content-Type', 'image/gif');
    response.setHeader('Cache-Control', 'public, max-age=86400');
    return response.send(Buffer.from(buffer));

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
