const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const env = require('../config/env');
const m3u8ProxyService = require('../services/m3u8-proxy.service');
const { CORS_PROXIES } = require('../config/proxy.config');

// Cache para datos de agenda y canales
let agendaCache = null;
let channelsCache = null;
let agendaCacheTime = 0;
let channelsCacheTime = 0;
const CACHE_DURATION = 60000;

/**
 * Carga un archivo JSON del backend/data con caching
 */
function loadDataFile(filename, cacheKey, cacheDurationMs = CACHE_DURATION) {
  try {
    const filepath = path.join(__dirname, `../../data/${filename}`);
    
    if (!fs.existsSync(filepath)) {
      logger.warn(`Archivo no encontrado: ${filepath}`);
      return null;
    }

    // Usar cache si está vigente
    if (cacheKey === 'agenda' && agendaCache && Date.now() - agendaCacheTime < cacheDurationMs) {
      return agendaCache;
    }
    if (cacheKey === 'channels' && channelsCache && Date.now() - channelsCacheTime < cacheDurationMs) {
      return channelsCache;
    }

    // Leer archivo
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    
    // Guardar en cache
    if (cacheKey === 'agenda') {
      agendaCache = data;
      agendaCacheTime = Date.now();
    } else if (cacheKey === 'channels') {
      channelsCache = data;
      channelsCacheTime = Date.now();
    }

    logger.info(`Cargado ${filename} desde disco (${cacheKey})`);
    return data;
  } catch (error) {
    logger.error(`Error cargando ${filename}:`, error.message);
    return null;
  }
}

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'futbol-libre-api', 
    timestamp: Date.now(),
    architecture: 'Railway (M3U8) → Vercel (caché) → Hugging Face (descarga)',
    environment: env.NODE_ENV
  });
});

/**
 * GET /api/agenda
 * Retorna la agenda de eventos scrapeada
 * 
 * Respuesta: Array de eventos con timestamps, canales, etc.
 */
router.get('/agenda', (req, res) => {
  try {
    const agenda = loadDataFile('agenda.json', 'agenda');
    
    if (!agenda) {
      return res.status(404).json({ 
        error: 'Agenda no disponible',
        message: 'El archivo de agenda aún no ha sido generado. Intente nuevamente en unos momentos.'
      });
    }

    res.json({
      success: true,
      count: Array.isArray(agenda) ? agenda.length : 0,
      data: agenda,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error en /agenda:', error.message);
    res.status(500).json({ error: 'Error al cargar la agenda' });
  }
});

/**
 * GET /api/channels
 * Retorna la lista completa de canales disponibles
 * 
 * Respuesta: { channels: [...] }
 */
router.get('/channels', (req, res) => {
  try {
    const channelsData = loadDataFile('channels-complete.json', 'channels');
    
    if (!channelsData) {
      return res.status(404).json({ 
        error: 'Canales no disponibles',
        channels: []
      });
    }

    const channels = channelsData.channels || channelsData;
    res.json({
      success: true,
      count: Array.isArray(channels) ? channels.length : 0,
      channels: channels,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error en /channels:', error.message);
    res.status(500).json({ error: 'Error al cargar los canales' });
  }
});

/**
 * Endpoint simple para obtener URL directa del provider
 * 
 * GET /api/stream-provider-url?stream=espn
 * 
 * Respuesta:
 * {
 *   "streamId": "espn",
 *   "url": "https://la14hd.com/vivo/canales.php?stream=espn",
 *   "provider": "la14hd"
 * }
 */
router.get('/stream-provider-url', (req, res) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    // URL del provider desde variables de entorno
    const baseUrl = env.PROVIDER_BASE_URL;
    const url = `${baseUrl}?stream=${encodeURIComponent(stream)}`;
    
    logger.info(`Devolviendo URL directa para stream: ${stream} (provider: ${baseUrl})`);
    
    res.json({
      streamId: stream,
      url: url,
      provider: 'la14hd',
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error en /stream-provider-url:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/m3u8-direct', async (req, res) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    const baseUrl = env.PROVIDER_BASE_URL;
    const providerUrl = `${baseUrl}?stream=${encodeURIComponent(stream)}`;
    
    const m3u8Url = await m3u8ProxyService.extractM3U8Url(providerUrl);
    
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    });

    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    
    logger.info(`[m3u8-direct] Protocol: ${protocol}, Host: ${host}, x-forwarded-proto: ${req.get('x-forwarded-proto')}`);
    
    const proxyUrl = `${protocol}://${host}/api/m3u8-proxy?url=${encodeURIComponent(m3u8Url)}`;

    res.json({
      success: true,
      streamId: stream,
      m3u8Url: proxyUrl,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error en /m3u8-direct:', error.message);
    res.status(500).json({ 
      error: 'Error extrayendo M3U8',
      message: error.message 
    });
  }
});

// Sistema de rotación de proxies para evitar rate limits
// Los proxies se configuran en config/proxy.config.js
let proxyIndex = 0;

function getNextProxy() {
  const proxy = CORS_PROXIES[proxyIndex];
  proxyIndex = (proxyIndex + 1) % CORS_PROXIES.length;
  return proxy;
}

router.get('/m3u8-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Parámetro url requerido' });
    }

    const content = await m3u8ProxyService.proxyM3U8Content(url);
    
    // ARQUITECTURA HÍBRIDA: Railway → Hugging Face → Vercel → Usuarios
    // Hugging Face descarga de fubohd.com, Vercel redistribuye
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    
    // URL de Hugging Face (descarga .ts de fubohd.com)
    const hfProxyUrl = process.env.HF_PROXY_URL 
      ? `${process.env.HF_PROXY_URL}/proxy`
      : null;
    
    // URL de Vercel CDN (opcional, para caché adicional)
    const vercelCdnUrl = process.env.VERCEL_PROXY_URL 
      ? `${process.env.VERCEL_PROXY_URL}/api/proxy`
      : null;
    
    logger.info(`[M3U8-PROXY] HF_PROXY_URL: ${process.env.HF_PROXY_URL || 'NOT SET'}`);
    logger.info(`[M3U8-PROXY] VERCEL_PROXY_URL: ${process.env.VERCEL_PROXY_URL || 'NOT SET'}`);
    logger.info(`[M3U8-PROXY] Using: ${vercelCdnUrl ? 'Vercel' : hfProxyUrl ? 'HF' : 'Railway direct'}`);
    
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    
    let segmentIndex = 0;
    const modifiedContent = content.replace(
      /^(?!#)(.+\.ts.*)$/gm,
      (match) => {
        segmentIndex++;
        // Convertir URLs relativas a absolutas
        const fullUrl = match.startsWith('http') ? match : baseUrl + match;
        
        // Arquitectura: Railway → Vercel → Hugging Face → fubohd.com
        // Railway apunta a Vercel (CDN que cachea)
        // Vercel obtiene de Hugging Face (si no está en caché)
        // Hugging Face descarga de fubohd.com (si no está en caché)
        
        if (vercelCdnUrl) {
          // Railway apunta a Vercel (Vercel obtendrá de HF internamente)
          return `${vercelCdnUrl}?url=${encodeURIComponent(fullUrl)}`;
        } else if (hfProxyUrl) {
          // Fallback: Railway apunta directo a Hugging Face
          return `${hfProxyUrl}?url=${encodeURIComponent(fullUrl)}`;
        } else {
          // Railway directo (sin CDN)
          return `${protocol}://${host}/api/segment-proxy?url=${encodeURIComponent(fullUrl)}`;
        }
      }
    );
    
    // Determinar arquitectura
    let architecture = 'Railway → Users';
    if (vercelCdnUrl && hfProxyUrl) {
      architecture = 'Railway (M3U8) → Vercel (caché) → Hugging Face (descarga) → fubohd.com';
    } else if (vercelCdnUrl) {
      architecture = 'Railway → Vercel CDN → Users';
    } else if (hfProxyUrl) {
      architecture = 'Railway (M3U8) → Hugging Face (descarga) → Users';
    }
    
    logger.info(`M3U8 modificado con ${segmentIndex} segmentos (${architecture})`);
    
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Cache-Control': 'no-cache'
    });

    res.send(modifiedContent);

  } catch (error) {
    logger.error('Error en /m3u8-proxy:', error.message);
    res.status(500).json({ 
      error: 'Error obteniendo M3U8',
      message: error.message 
    });
  }
});

module.exports = router;
