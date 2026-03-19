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
    
    console.log(`[Vercel CDN] HF_PROXY_URL: ${HF_PROXY_URL}`);
    console.log(`[Vercel CDN] Target URL: ${targetUrl.substring(0, 100)}...`);
    console.log(`[Vercel CDN] Full HF URL: ${hfProxyUrl.substring(0, 150)}...`);

    // Hacer la petición a Hugging Face
    const response = await fetch(hfProxyUrl, {
      headers: {
        'Accept': '*/*',
      },
      redirect: 'follow'
    });
    
    console.log(`[Vercel CDN] HF Response: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.error(`[Vercel CDN] Hugging Face error: ${response.status}`);
      
      // Intentar leer el error de HF
      let errorDetail = response.statusText;
      try {
        const errorText = await response.text();
        if (errorText.length < 1000) {
          errorDetail = errorText;
        }
      } catch (e) {}
      
      return new Response(JSON.stringify({ 
        error: 'Upstream error from Hugging Face',
        status: response.status,
        statusText: response.statusText,
        detail: errorDetail
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
    
    // CRÍTICO: Verificar Content-Type ANTES de descargar
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
      console.error(`[Vercel CDN] Invalid Content-Type from HF: ${contentType}`);
      const errorBody = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Invalid video segment',
        detail: `Hugging Face returned ${contentType} instead of video/mp2t. Segment may be unavailable or token expired.`,
        contentType: contentType,
        preview: errorBody.substring(0, 500)
      }), {
        status: 502,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const body = await response.arrayBuffer();

    console.log(`[Vercel CDN] Success: ${body.byteLength} bytes from Hugging Face (expected: ${contentLength || 'unknown'}), Content-Type: ${contentType}`);
    
    // CRÍTICO: Detectar si es HTML o JSON (doble verificación)
    if (body.byteLength > 0 && body.byteLength < 100000) {
      try {
        const text = new TextDecoder().decode(body.slice(0, 200));
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<body')) {
          console.error(`[Vercel CDN] Response is HTML despite Content-Type: ${contentType}`);
          return new Response(JSON.stringify({ 
            error: 'Invalid video segment',
            detail: 'Upstream returned HTML instead of video data. Token may have expired.',
            contentType: contentType,
            preview: text.substring(0, 200)
          }), {
            status: 502,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          console.error(`[Vercel CDN] Response is JSON despite Content-Type: ${contentType}`);
          return new Response(JSON.stringify({ 
            error: 'Invalid video segment',
            detail: 'Upstream returned JSON instead of video data',
            contentType: contentType,
            preview: text.substring(0, 200)
          }), {
            status: 502,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (e) {
        // Si no se puede decodificar, probablemente es binario (bueno)
      }
    }
    
    // Validar que el fragmento sea MPEG-TS válido
    if (body.byteLength > 0) {
      const firstByte = new Uint8Array(body)[0];
      if (firstByte !== 0x47) {
        console.error(`[Vercel CDN] Invalid MPEG-TS sync byte: 0x${firstByte.toString(16)}`);
        // Mostrar primeros bytes para debugging
        const preview = Array.from(new Uint8Array(body).slice(0, 32))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.error(`[Vercel CDN] First 32 bytes: ${preview}`);
        
        return new Response(JSON.stringify({ 
          error: 'Invalid video segment',
          detail: 'Missing MPEG-TS sync byte (0x47)',
          firstByte: `0x${firstByte.toString(16)}`,
          preview: preview
        }), {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Verificar múltiples sync bytes
      const bytes = new Uint8Array(body);
      let syncCount = 0;
      for (let i = 0; i < Math.min(bytes.length, 188 * 10); i += 188) {
        if (bytes[i] === 0x47) syncCount++;
      }
      
      if (syncCount < 3) {
        console.error(`[Vercel CDN] Not enough MPEG-TS sync bytes: ${syncCount}`);
        return new Response(JSON.stringify({ 
          error: 'Invalid video segment',
          detail: `Not enough MPEG-TS sync bytes found: ${syncCount}`,
          size: body.byteLength
        }), {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      console.log(`[Vercel CDN] ✅ Valid MPEG-TS: ${syncCount} sync bytes`);
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
