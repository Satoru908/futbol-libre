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
    
    // ARQUITECTURA HÍBRIDA:
    // Backend maneja playlists (IP limpia, evita 403)
    // Cloudflare Worker maneja segmentos (escala infinito)
    const proxyUrl = `/api/hls-proxy?url=${encodeURIComponent(data.url)}`;
    
    res.json({
      playbackUrl: proxyUrl,
      expiresAt: data.expiresAt,
      proxy: 'hybrid', // Backend (playlists) + Cloudflare (segmentos)
      cloudflareWorker: !!env.CLOUDFLARE_WORKER_URL
    });

  } catch (error) {
    next(error);
  }
});

// Proxy HLS Híbrido - Solo maneja playlists
// Los segmentos pasan por Cloudflare Worker
router.get('/hls-proxy', async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Parámetro url requerido' });
    }

    const hlsProxyService = require('../services/hls-proxy.service');
    
    // ARQUITECTURA HÍBRIDA:
    // Backend solo maneja playlists (.m3u8)
    // Segmentos (.ts) van directo a Cloudflare Worker
    
    if (url.includes('.m3u8')) {
      // Playlist: Backend descarga con IP limpia (evita 403)
      await hlsProxyService.proxyPlaylist(url, res);
    } else {
      // Segmento: Fallback si Cloudflare falla
      // Normalmente no debería llegar aquí
      await hlsProxyService.proxySegment(url, res);
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
