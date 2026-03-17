const express = require('express');
const router = express.Router();
const streamUrlService = require('../services/stream-url.service');
const hlsProxyService = require('../services/hls-proxy.service');
const logger = require('../utils/logger');

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'futbol-libre-api', timestamp: Date.now() });
});

// Obtener URL resolved del stream
router.get('/stream-url', async (req, res, next) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    const data = await streamUrlService.resolveStreamUrl(stream);
    
    if (data.requiresProxy) {
      const proxyUrl = `/api/hls-proxy?url=${encodeURIComponent(data.url)}`;
      
      return res.json({
        playbackUrl: proxyUrl,
        expiresAt: data.expiresAt
      });
    }

    res.json({ 
      playbackUrl: data.url, 
      expiresAt: data.expiresAt 
    });

  } catch (error) {
    next(error);
  }
});

// Proxy HLS
router.get('/hls-proxy', async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).send('Parámetro url requerido');
    }

    const isPlaylist = url.includes('.m3u8');

    if (isPlaylist) {
      await hlsProxyService.proxyPlaylist(url, res);
    } else {
      await hlsProxyService.proxySegment(url, res);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
