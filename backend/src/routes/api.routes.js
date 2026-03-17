const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const env = require('../config/env');
const la14Provider = require('../providers/la14hd.provider');
const htmlSanitizerService = require('../services/html-sanitizer.service');

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

module.exports = router;
