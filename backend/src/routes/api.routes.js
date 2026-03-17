const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const env = require('../config/env');

// Cache para datos de agenda y canales
let agendaCache = null;
let channelsCache = null;
let agendaCacheTime = 0;
let channelsCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minuto

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
    architecture: 'direct-proxy-simple',
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

module.exports = router;
