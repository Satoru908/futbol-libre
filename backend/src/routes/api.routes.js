const express = require('express');
const router = express.Router();
const streamUrlService = require('../services/stream-url.service');
const logger = require('../utils/logger');
const env = require('../config/env');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'futbol-libre-api', 
    timestamp: Date.now(),
    cloudflareWorker: !!env.CLOUDFLARE_WORKER_URL
  });
});

// Obtener URL resolved del stream
router.get('/stream-url', async (req, res, next) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    const data = await streamUrlService.resolveStreamUrl(stream);
    
    // TEMPORAL: Cloudflare Worker bloqueado por upstream (403)
    // Usar proxy local del backend para playlists
    const proxyUrl = `/api/hls-proxy?url=${encodeURIComponent(data.url)}`;
    
    res.json({
      playbackUrl: proxyUrl,
      expiresAt: data.expiresAt,
      proxy: 'backend'
    });

  } catch (error) {
    next(error);
  }
});

// Proxy HLS - maneja playlists y segmentos
router.get('/hls-proxy', async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Parámetro url requerido' });
    }

    const hlsProxyService = require('../services/hls-proxy.service');
    
    // Detectar si es playlist o segmento
    if (url.includes('.m3u8')) {
      await hlsProxyService.proxyPlaylist(url, res);
    } else {
      await hlsProxyService.proxySegment(url, res);
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
