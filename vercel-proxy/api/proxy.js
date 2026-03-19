/**
 * Vercel Edge Function - Proxy CORS que redistribuye desde Railway
 * 
 * Este proxy actúa como CDN:
 * - Railway descarga de fubohd.com (1 conexión)
 * - Vercel redistribuye a miles de usuarios (100 GB/mes gratis)
 * - Cachea segmentos globalmente
 */

export const config = {
  runtime: 'edge',
};

// URL de tu backend en Railway
const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL || 'https://futbol-libre-production-5102.up.railway.app';

export default async function handler(req) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // En lugar de ir directo a fubohd.com, ir a Railway
    // Railway ya tiene los headers correctos y no está bloqueado
    const railwayProxyUrl = `${RAILWAY_BACKEND}/api/segment-proxy?url=${encodeURIComponent(targetUrl)}`;
    
    console.log(`[Vercel CDN] Fetching from Railway: ${railwayProxyUrl}`);

    // Hacer la petición a Railway
    const response = await fetch(railwayProxyUrl, {
      headers: {
        'Accept': '*/*',
      },
      // Importante: seguir redirects
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[Vercel CDN] Railway error: ${response.status}`);
      return new Response(JSON.stringify({ 
        error: 'Upstream error',
        status: response.status,
        statusText: response.statusText
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Obtener el contenido
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    // Crear nueva respuesta con headers CORS y caché agresivo
    const newResponse = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        // Caché agresivo en Vercel Edge (60 segundos)
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
        'X-Proxy-By': 'Vercel Edge CDN',
        'X-Upstream': 'Railway'
      }
    });

    return newResponse;

  } catch (error) {
    console.error('[Vercel CDN] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
