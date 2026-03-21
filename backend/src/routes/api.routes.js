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
const CACHE_DURATION = 60000;

/**
 * Carga un archivo JSON del backend/data con caching
 */
function loadDataFile(filename, cacheKey, cacheDurationMs = CACHE_DURATION) {
  try {
    const filepath = path.join(__dirname, `../../data/${filename}`);
    
    if (!fs.existsSync(filepath)) {
      logger.warn(`Archivo no encontrado: ${filepath} - Se creará con el scraper`);
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
    provider: 'bolaloca.my',
    playerType: 'iframe',
    totalChannels: 200,
    environment: env.NODE_ENV
  });
});

/**
 * GET /api/agenda
 * Retorna la agenda de eventos scrapeada
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
 * Retorna la lista completa de canales de bolaloca.my
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
      provider: 'bolaloca.my',
      playerType: 'iframe',
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error en /channels:', error.message);
    res.status(500).json({ error: 'Error al cargar los canales' });
  }
});

/**
 * Endpoint para obtener URL de iframe de bolaloca.my
 * 
 * GET /api/stream-url?stream=bolaloca_89
 * 
 * Respuesta:
 * {
 *   "streamId": "bolaloca_89",
 *   "iframeUrl": "https://bolaloca.my/player/capo/89",
 *   "provider": "bolaloca.my"
 * }
 */
router.get('/stream-url', async (req, res) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      logger.error('[API] stream-url: Parámetro stream faltante');
      return res.status(400).json({ 
        error: 'Parámetro stream requerido',
        example: '/api/stream-url?stream=bolaloca_89'
      });
    }

    logger.info(`[API] stream-url: Obteniendo URL para stream: ${stream}`);
    
    // Extraer el número de canal de bolaloca
    const channelMatch = stream.match(/bolaloca_(\d+)/);
    
    if (!channelMatch) {
      return res.status(400).json({
        error: 'Formato de stream inválido',
        example: '/api/stream-url?stream=bolaloca_89'
      });
    }
    
    const channelNumber = channelMatch[1];
    const iframeUrl = `https://bolaloca.my/player/capo/${channelNumber}`;
    
    logger.info(`[API] stream-url: ✅ URL de iframe generada`);
    
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    });
    
    res.json({
      success: true,
      streamId: stream,
      channelNumber: parseInt(channelNumber),
      iframeUrl: iframeUrl,
      provider: 'bolaloca.my',
      playerType: 'iframe',
      note: 'Usar iframe sin sandbox para reproducir',
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('[API] stream-url: Error:', error.message);
    logger.error('[API] stream-url: Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Error obteniendo stream',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
