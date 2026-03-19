/**
 * Cloudflare Worker para proxear segmentos M3U8
 * 
 * Deploy: https://dash.cloudflare.com/
 * 
 * Límites gratuitos:
 * - 100,000 requests/día
 * - 10ms CPU time por request
 */

export default {
  async fetch(request, env, ctx) {
    // Manejar preflight CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Solo permitir GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain'
        }
      });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');

      // Validar que se proporcionó una URL
      if (!targetUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing url parameter' }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Validar que la URL es de fubohd.com o newkso.ru
      const targetDomain = new URL(targetUrl).hostname;
      if (!targetDomain.includes('fubohd.com') && !targetDomain.includes('newkso.ru')) {
        return new Response(
          JSON.stringify({ error: 'Invalid domain', domain: targetDomain }),
          { 
            status: 403,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Hacer la petición al servidor origen con headers correctos
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://la14hd.com/',
          'Origin': 'https://la14hd.com',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        cf: {
          // Cloudflare-specific options
          cacheTtl: 3600, // Cache por 1 hora
          cacheEverything: true
        }
      });

      // Si la petición falló, devolver el error CON CORS
      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            error: 'Upstream error',
            status: response.status,
            statusText: response.statusText,
            url: targetUrl
          }),
          { 
            status: response.status,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Crear nueva respuesta con headers CORS
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // Agregar headers CORS (IMPORTANTE)
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      // Agregar cache headers
      newResponse.headers.set('Cache-Control', 'public, max-age=3600');
      
      return newResponse;

    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal error',
          message: error.message 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }
};
