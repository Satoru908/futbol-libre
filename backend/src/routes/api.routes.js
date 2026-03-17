const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');
const env = require('../config/env');
const la14Provider = require('../providers/la14hd.provider');
const htmlSanitizerService = require('../services/html-sanitizer.service');
const hlsStreamResolver = require('../services/hls-stream-resolver.service');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'futbol-libre-api', 
    timestamp: Date.now(),
    architecture: 'inverse-proxy-with-sanitizer'
  });
});

// Endpoint para traer HTML puro como CORS Proxy (Client-Side scraping)
router.get('/stream-html', async (req, res, next) => {
  try {
    const { stream, provider } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    let html = '';
    // Por ahora la14hd es el por defecto
    if (!provider || provider === 'la14hd') {
      html = await la14Provider.fetchHtml(stream);
    } else {
      return res.status(400).json({ error: 'Provider desconocido' });
    }

    if (!html) {
      return res.status(404).json({ error: 'No se pudo obtener el contenido' });
    }

    // Retorna el text plano (HTML)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    next(error);
  }
});

/**
 * NUEVO: Endpoint para traer HTML sanitizado (sin scripts maliciosos)
 * 
 * Flujo:
 * 1. Recibe streamId del parámetro query
 * 2. Valida parámetros
 * 3. Obtiene HTML del provider (con caché interno del provider)
 * 4. Sanitiza via htmlSanitizerService (elimina ads, pop-ups, trackers)
 * 5. Retorna HTML limpio para cargar en iframe
 * 
 * GET /api/stream-html-cleaned?stream=:streamId&provider=la14hd
 */
router.get('/stream-html-cleaned', async (req, res, next) => {
  try {
    const { stream, provider } = req.query;
    
    // Validación de parámetros
    if (!stream) {
      logger.warn('GET /stream-html-cleaned: Parámetro stream faltante');
      return res.status(400).json({ 
        error: 'Parámetro stream requerido',
        example: '/api/stream-html-cleaned?stream=futbol&provider=la14hd'
      });
    }

    // Determinar provider
    const selectedProvider = provider || 'la14hd';
    let htmlProvider = null;

    if (selectedProvider === 'la14hd') {
      htmlProvider = la14Provider.fetchHtml.bind(la14Provider);
    } else {
      logger.error(`Provider desconocido: ${selectedProvider}`);
      return res.status(400).json({ error: 'Provider desconocido. Soportados: la14hd' });
    }

    // Sanitizar y obtener HTML limpio
    logger.info(`Procesando GET /stream-html-cleaned para stream: ${stream}`);
    const cleanHtml = await htmlSanitizerService.sanitizeStream(stream, htmlProvider);

    if (!cleanHtml) {
      logger.error(`No se pudo obtener HTML sanitizado para stream: ${stream}`);
      return res.status(500).json({ error: 'No se pudo obtener el contenido del stream' });
    }

    // Retorna HTML limpio con headers apropiados
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevenir MIME type sniffing
    // IMPORTANTE: NO setear X-Frame-Options restrictivo aquí
    // El HTML está sanitizado, puede cargarse desde cualquier origen
    // Si necesitas restricción, usa ALLOWALL en lugar de SAMEORIGIN
    res.removeHeader('X-Frame-Options'); // Remover cualquier restricción de iframe
    res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache por 30 minutos

    logger.info(`HTML sanitizado entregado para stream: ${stream}`);
    res.send(cleanHtml);

  } catch (error) {
    logger.error(`Error en GET /stream-html-cleaned:`, error.message);
    next(error);
  }
});

/**
 * Endpoint de diagnóstico: Obtener estadísticas del caché sanitizador
 * GET /api/sanitizer-stats
 */
router.get('/sanitizer-stats', (req, res) => {
  const stats = htmlSanitizerService.getCacheStats();
  res.json({
    message: 'Estadísticas del servicio de sanitización',
    stats
  });
});

/**
 * NUEVO: Endpoint para obtener URL del stream HLS con token fresco
 * 
 * Este endpoint es superior al HTML sanitizado porque:
 * 1. Obtiene un token FRESCO cada vez (no expirado)
 * 2. Retorna solo la URL del stream, no todo el HTML
 * 3. El frontend puede usar su propio reproductor
 * 4. Menos overhead: solo una URL JSON, no 1600+ bytes de HTML
 * 
 * Uso:
 * GET /api/stream-url?stream=foxsports3
 * 
 * Respuesta:
 * {
 *   "streamId": "foxsports3",
 *   "url": "https://x4bnd7lq.fubohd.com:443/foxsports3/mono.m3u8?token=...",
 *   "provider": "la14hd",
 *   "timestamp": 1773765876543
 * }
 */
router.get('/stream-url', async (req, res, next) => {
  try {
    const { stream, provider } = req.query;

    if (!stream) {
      logger.warn('GET /stream-url: Parámetro stream faltante');
      return res.status(400).json({
        error: 'Parámetro stream requerido',
        example: '/api/stream-url?stream=foxsports3'
      });
    }

    const selectedProvider = provider || 'la14hd';
    let htmlProvider = null;

    if (selectedProvider === 'la14hd') {
      htmlProvider = la14Provider.fetchHtml.bind(la14Provider);
    } else {
      logger.error(`Provider desconocido en /stream-url: ${selectedProvider}`);
      return res.status(400).json({ error: 'Provider desconocido' });
    }

    // Obtener URL del stream con headers necesarios
    logger.info(`Obteniendo URL del stream para: ${stream}`);
    const streamData = await hlsStreamResolver.getStreamUrl(stream, htmlProvider);

    if (!streamData) {
      logger.error(`No se pudo obtener URL del stream para: ${stream}`);
      return res.status(500).json({ error: 'No se pudo obtener la URL del stream' });
    }

    // Retornar URL + headers en formato JSON
    res.json({
      streamId: stream,
      url: streamData.url,
      headers: streamData.headers,
      provider: selectedProvider,
      timestamp: Date.now()
    });

    logger.info(`URL del stream entregada para: ${stream}`);

  } catch (error) {
    logger.error(`Error en GET /stream-url:`, error.message);
    next(error);
  }
});

/**
 * NUEVO: Endpoint para obtener el manifesto HLS (.m3u8) con headers correctos
 * 
 * El navegador rechaza headers como Referer/Origin por seguridad
 * pero el servidor SÍ puede enviarlos.
 * 
 * Flujo:
 * 1. Frontend pide /api/stream-manifest?stream=foxsports3
 * 2. Backend obtiene URL del stream
 * 3. Backend descarga el .m3u8 desde FuboHD (CON headers)
 * 4. Backend devuelve el .m3u8 al frontend
 * 5. Frontend usa el .m3u8 en hls.js
 * 6. Segmentos de video se descargan directamente de FuboHD (NO pasan por servidor)
 * 
 * GET /api/stream-manifest?stream=foxsports3
 */
router.get('/stream-manifest', async (req, res, next) => {
  try {
    const { stream, provider } = req.query;

    if (!stream) {
      logger.warn('GET /stream-manifest: Parámetro stream faltante');
      return res.status(400).json({
        error: 'Parámetro stream requerido',
        example: '/api/stream-manifest?stream=foxsports3'
      });
    }

    const selectedProvider = provider || 'la14hd';
    let htmlProvider = null;

    if (selectedProvider === 'la14hd') {
      htmlProvider = la14Provider.fetchHtml.bind(la14Provider);
    } else {
      logger.error(`Provider desconocido en /stream-manifest: ${selectedProvider}`);
      return res.status(400).json({ error: 'Provider desconocido' });
    }

    // Obtener URL del stream
    logger.info(`Obteniendo manifesto para: ${stream}`);
    const streamData = await hlsStreamResolver.getStreamUrl(stream, htmlProvider);

    if (!streamData) {
      logger.error(`No se pudo obtener URL del stream para: ${stream}`);
      return res.status(500).json({ error: 'No se pudo obtener la URL del stream' });
    }

    const streamUrl = streamData.url;
    logger.info(`URL del stream para manifesto: ${streamUrl}`);

    // Descargar el manifesto avec headers correctos
    logger.info(`Descargando manifesto HLS desde: ${streamUrl}`);
    const manifestResponse = await axios.get(streamUrl, {
      headers: {
        'Referer': 'https://la14hd.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://la14hd.com'
      },
      timeout: 10000
    });

    if (!manifestResponse.data) {
      logger.error(`Manifesto vacío para stream: ${stream}`);
      return res.status(500).json({ error: 'Manifesto HLS vacío' });
    }

    // Reescribir URLs relativas en el manifesto para que apunten al CDN original
    // Extraer base URL del stream (dominio + puerto + ruta sin archivo)
    const urlObj = new URL(streamUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;
    
    logger.info(`URL base para reescribir manifesto: ${baseUrl}`);
    
    // Reescribir URLs relativas en el manifesto a URLs absolutas
    let manifestContent = manifestResponse.data;
    
    // Procesar línea por línea
    const lines = manifestContent.split('\n');
    const rewrittenLines = lines.map(line => {
      const trimmedLine = line.trim();
      
      // Si la línea no es un comentario (#) y no es vacía
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // Si no comienza con http:// o https://, es una URL relativa - añadir base URL
        if (!trimmedLine.startsWith('http://') && !trimmedLine.startsWith('https://')) {
          logger.info(`Reescribiendo URL relativa: ${trimmedLine} -> ${baseUrl}${trimmedLine}`);
          return baseUrl + trimmedLine;
        }
      }
      
      return line;
    });
    
    manifestContent = rewrittenLines.join('\n');

    logger.info(`Manifesto obtenido exitosamente para: ${stream} (${manifestResponse.data.length} -> ${manifestContent.length} bytes después de reescritura)`);

    // Retornar el manifesto al frontend
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('X-Stream-Id', stream);
    res.send(manifestContent);

  } catch (error) {
    logger.error(`Error en GET /stream-manifest:`, error.message);
    res.status(500).json({
      error: 'Error obteniendo manifesto',
      details: error.message
    });
  }
});

module.exports = router;
