const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const env = require('../config/env');
const streamtpProvider = require('../providers/streamtpnew.provider');

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
    architecture: 'Railway (API + M3U8) → Usuario (descarga directa de streameasthd.net)',
    provider: 'streamtpnew.com',
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
 * Endpoint para obtener URL M3U8 directa de streamtpnew.com
 * 
 * GET /api/stream-url?stream=espn
 * 
 * Respuesta:
 * {
 *   "streamId": "espn",
 *   "m3u8Url": "https://24a1.streameasthd.net:443/global/espn/index.m3u8?token=...",
 *   "provider": "streamtpnew.com"
 * }
 */
router.get('/stream-url', async (req, res) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      logger.error('[API] stream-url: Parámetro stream faltante');
      return res.status(400).json({ 
        error: 'Parámetro stream requerido',
        example: '/api/stream-url?stream=espn'
      });
    }

    logger.info(`[API] stream-url: Obteniendo M3U8 para stream: ${stream}`);
    
    // Obtener M3U8 URL de streamtpnew.com
    const m3u8Url = await streamtpProvider.getM3U8Url(stream);
    
    logger.info(`[API] stream-url: ✅ M3U8 obtenido exitosamente`);
    
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    });
    
    res.json({
      success: true,
      streamId: stream,
      m3u8Url: m3u8Url,
      provider: 'streamtpnew.com',
      architecture: 'Usuario descarga directamente de streameasthd.net',
      tokenValidity: '15 horas',
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

/**
 * Endpoint de prueba para verificar el provider
 */
router.get('/test-provider', async (req, res) => {
  try {
    logger.info('[API] test-provider: Probando provider de streamtpnew.com');
    
    const testStream = 'espn';
    const m3u8Url = await streamtpProvider.getM3U8Url(testStream);
    
    res.json({
      success: true,
      message: 'Provider funcionando correctamente',
      testStream: testStream,
      m3u8Url: m3u8Url
    });
    
  } catch (error) {
    logger.error('[API] test-provider: Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Endpoint para forzar scraping de canales
 */
router.get('/scrape-channels', async (req, res) => {
  try {
    logger.info('[API] scrape-channels: Iniciando scraping manual');
    
    const { scrapeAndSave } = require('../scrapers/channels.scraper');
    const channels = await scrapeAndSave();
    
    if (channels) {
      res.json({
        success: true,
        message: 'Canales scrapeados exitosamente',
        count: channels.length,
        channels: channels.slice(0, 5) // Mostrar solo los primeros 5
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error scrapeando canales'
      });
    }
    
  } catch (error) {
    logger.error('[API] scrape-channels: Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
