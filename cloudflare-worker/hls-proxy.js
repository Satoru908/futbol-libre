/**
 * Cloudflare Worker - HLS Proxy
 * Proxy escalable para streams HLS que maneja miles de usuarios
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Manejar preflight CORS (OPTIONS)
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  const url = new URL(request.url);
  
  // Obtener URL del stream desde query parameter
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return corsResponse('Missing url parameter', 400);
  }

  // Validar que sea una URL válida
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return corsResponse('Invalid URL', 400);
  }

  // Detectar si es playlist (.m3u8) o segmento (.ts, .key, etc)
  const isPlaylist = targetUrl.includes('.m3u8');

  try {
    // Headers ultra-minimalistas - solo lo esencial
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Hacer request al origen - sin cache para evitar problemas
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`Upstream error: ${response.status} for ${targetUrl}`);
      
      // Log adicional para debugging
      const responseText = await response.text();
      console.error(`Response body: ${responseText.substring(0, 200)}`);
      
      return corsResponse(`Upstream error: ${response.status}`, response.status);
    }

    // Si es playlist, reescribir URLs
    if (isPlaylist) {
      return await rewritePlaylist(response, targetUrl, url.origin);
    }

    // Si es segmento, retornar directamente con CORS
    return addCorsHeaders(response);

  } catch (error) {
    console.error(`Proxy error: ${error.message}`);
    return corsResponse(`Proxy error: ${error.message}`, 500);
  }
}

/**
 * Maneja peticiones OPTIONS (CORS preflight)
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Crea una respuesta con CORS
 */
function corsResponse(message, status = 200) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}

/**
 * Reescribe las URLs en el playlist para que pasen por el worker
 */
async function rewritePlaylist(response, originalUrl, workerOrigin) {
  let content = await response.text();
  
  // Extraer base URL y query params
  const urlObj = new URL(originalUrl);
  const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
  const queryParams = urlObj.search; // Incluye el token

  // Reescribir cada línea que no sea comentario
  const lines = content.split('\n');
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    
    // Ignorar líneas vacías y comentarios
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    // Construir URL absoluta del segmento
    let segmentUrl = trimmed;
    if (!segmentUrl.startsWith('http')) {
      segmentUrl = new URL(segmentUrl, baseUrl).toString();
      
      // Propagar query params (token) si el segmento no los tiene
      if (!segmentUrl.includes('?') && queryParams) {
        segmentUrl += queryParams;
      }
    }

    // Reescribir para que pase por el worker
    return `${workerOrigin}?url=${encodeURIComponent(segmentUrl)}`;
  });

  const rewrittenContent = rewrittenLines.join('\n');

  // Crear respuesta con CORS
  return new Response(rewrittenContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Proxy': 'cloudflare-worker',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/**
 * Añade headers CORS a la respuesta
 */
function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');
  newHeaders.set('Access-Control-Expose-Headers', '*');
  newHeaders.set('X-Proxy', 'cloudflare-worker');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
