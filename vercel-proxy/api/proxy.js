/**
 * Vercel Edge Function - Proxy que cachea desde Hugging Face
 * 
 * Arquitectura: Railway → Vercel (caché) → Hugging Face (descarga) → fubohd.com
 * 
 * - Vercel cachea 120 segundos (reduce requests a HF)
 * - Hugging Face descarga de fubohd.com (no bloqueado)
 * - Triple caché: HF (60s) + Vercel (120s) + Navegador
 */

export const config = {
  runtime: 'edge',
};

// URL de Hugging Face Space
const HF_PROXY_URL = process.env.HF_PROXY_URL || 'https://satoru123908-futbol-libre.hf.space';

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

    // Vercel obtiene de Hugging Face
    // targetUrl = https://fubohd.com/espn/segment-001.ts
    const hfProxyUrl = `${HF_PROXY_URL}/proxy?url=${encodeURIComponent(targetUrl)}`;
    
    console.log(`[Vercel CDN] Fetching from Hugging Face: ${hfProxyUrl.substring(0, 100)}...`);

    // Hacer la petición a Hugging Face
    const response = await fetch(hfProxyUrl, {
      headers: {
        'Accept': '*/*',
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[Vercel CDN] Hugging Face error: ${response.status}`);
      return new Response(JSON.stringify({ 
        error: 'Upstream error from Hugging Face',
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

    // Obtener el contenido como ArrayBuffer para preservar datos binarios
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    const contentLength = response.headers.get('content-length');
    const body = await response.arrayBuffer();

    console.log(`[Vercel CDN] Success: ${body.byteLength} bytes from Hugging Face (expected: ${contentLength || 'unknown'})`);
    
    // Validar que el fragmento sea MPEG-TS válido
    if (body.byteLength > 0) {
      const firstByte = new Uint8Array(body)[0];
      if (firstByte !== 0x47) {
        console.error(`[Vercel CDN] Invalid MPEG-TS sync byte: 0x${firstByte.toString(16)}`);
        return new Response(JSON.stringify({ 
          error: 'Invalid video segment',
          detail: 'Missing MPEG-TS sync byte'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Crear nueva respuesta con headers CORS y caché agresivo
    const newResponse = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        // Caché agresivo en Vercel Edge (120 segundos = 2 minutos)
        // Esto reduce requests a Hugging Face en 99%
        'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
        'X-Proxy-By': 'Vercel Edge CDN',
        'X-Upstream': 'Hugging Face',
        'X-Cache': response.headers.get('x-cache') || 'UNKNOWN'
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
