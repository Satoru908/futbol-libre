/**
 * Vercel Edge Function - CDN para Render
 * 
 * Arquitectura: Usuario → Vercel (caché) → Render (tokens frescos) → fubohd.com
 * 
 * - Vercel cachea fragmentos .ts por 120 segundos
 * - M3U8 sin caché (siempre fresco de Render)
 * - Reduce latencia y carga en Render
 */

export const config = {
  runtime: 'edge',
};

const RENDER_PROXY_URL = process.env.RENDER_PROXY_URL || 'https://futbol-libre-1ahg.onrender.com';

export default async function handler(req) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Vercel ${requestId}] ========== NEW REQUEST ==========`);
  console.log(`[Vercel ${requestId}] Method: ${req.method}`);
  console.log(`[Vercel ${requestId}] URL: ${req.url}`);
  
  if (req.method !== 'GET') {
    console.log(`[Vercel ${requestId}] ❌ Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { pathname, searchParams } = new URL(req.url);
    console.log(`[Vercel ${requestId}] Pathname: ${pathname}`);
    console.log(`[Vercel ${requestId}] Search params: ${searchParams.toString()}`);
    
    // Log de variables de entorno
    console.log(`[Vercel ${requestId}] RENDER_PROXY_URL: ${RENDER_PROXY_URL}`);
    
    // Determinar qué endpoint de Render llamar
    let renderUrl;
    let cacheControl;
    
    if (pathname === '/api/m3u8') {
      // M3U8 - Sin caché, siempre fresco
      const stream = searchParams.get('stream');
      if (!stream) {
        console.log(`[Vercel ${requestId}] ❌ Missing stream parameter`);
        return new Response(JSON.stringify({ error: 'Missing stream parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      renderUrl = `${RENDER_PROXY_URL}/m3u8?stream=${encodeURIComponent(stream)}`;
      cacheControl = 'no-cache, no-store, must-revalidate';
      console.log(`[Vercel ${requestId}] Endpoint: M3U8 (stream: ${stream})`);
      
    } else if (pathname === '/api/m3u8-variant') {
      // M3U8 variante - Sin caché
      const url = searchParams.get('url');
      if (!url) {
        console.log(`[Vercel ${requestId}] ❌ Missing url parameter`);
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      renderUrl = `${RENDER_PROXY_URL}/m3u8-variant?url=${encodeURIComponent(url)}`;
      cacheControl = 'no-cache, no-store, must-revalidate';
      console.log(`[Vercel ${requestId}] Endpoint: M3U8 Variant`);
      
    } else if (pathname === '/api/segment') {
      // Fragmentos .ts - Caché agresivo
      const url = searchParams.get('url');
      if (!url) {
        console.log(`[Vercel ${requestId}] ❌ Missing url parameter`);
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      renderUrl = `${RENDER_PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
      cacheControl = 'public, max-age=120, s-maxage=120, stale-while-revalidate=60';
      console.log(`[Vercel ${requestId}] Endpoint: Segment (.ts)`);
      console.log(`[Vercel ${requestId}] Target URL: ${url.substring(0, 80)}...`);
      
    } else {
      console.log(`[Vercel ${requestId}] ❌ Invalid endpoint: ${pathname}`);
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log(`[Vercel ${requestId}] Fetching from Render: ${renderUrl.substring(0, 100)}...`);

    const response = await fetch(renderUrl, {
      headers: { 'Accept': '*/*' },
      redirect: 'follow'
    });

    console.log(`[Vercel ${requestId}] Render response status: ${response.status}`);
    console.log(`[Vercel ${requestId}] Render content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.error(`[Vercel ${requestId}] ❌ Render error: ${response.status}`);
      const errorText = await response.text();
      console.error(`[Vercel ${requestId}] Error body: ${errorText.substring(0, 200)}`);
      return new Response(errorText, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    console.log(`[Vercel ${requestId}] ✅ Success: ${body.byteLength} bytes, Content-Type: ${contentType}`);
    console.log(`[Vercel ${requestId}] Cache-Control: ${cacheControl}`);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Cache-Control': cacheControl,
        'X-Proxy-By': 'Vercel Edge CDN',
        'X-Upstream': 'Render',
        'X-Cache': response.headers.get('x-cache') || 'UNKNOWN'
      }
    });

  } catch (error) {
    console.error(`[Vercel ${requestId}] ❌ Exception:`, error);
    console.error(`[Vercel ${requestId}] Error message: ${error.message}`);
    console.error(`[Vercel ${requestId}] Error stack: ${error.stack}`);
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
