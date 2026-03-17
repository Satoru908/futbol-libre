const express = require('express');
const router = express.Router();
const streamUrlService = require('../services/stream-url.service');
const logger = require('../utils/logger');
const env = require('../config/env');
const { createProxyMiddleware } = require('http-proxy-middleware');
const hlsProxyService = require('../services/hls-proxy.service');
const cryptoUtils = require('../utils/crypto'); // <-- Utilidad de encriptación

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'futbol-libre-api', 
    timestamp: Date.now(),
    architecture: 'local-middleware-encrypted'
  });
});

// Obtener URL resolved del stream (Ahora encriptada)
router.get('/stream-url', async (req, res, next) => {
  try {
    const { stream } = req.query;
    
    if (!stream) {
      return res.status(400).json({ error: 'Parámetro stream requerido' });
    }

    const data = await streamUrlService.resolveStreamUrl(stream);
    
    // Encriptar la URL original para que no se vea en F12
    const encryptedToken = cryptoUtils.encrypt(data.url);
    const proxyUrl = `/api/hls-proxy?q=${encodeURIComponent(encryptedToken)}`;
    
    res.json({
      playbackUrl: proxyUrl,
      expiresAt: data.expiresAt,
      proxy: 'local-middleware-encrypted'
    });

  } catch (error) {
    next(error);
  }
});

// Proxy HLS Local - Intercepta el token 'q', lo desencripta y procesa
router.get('/hls-proxy', async (req, res, next) => {
  const token = req.query.q;
  
  if (!token) {
    return res.status(403).json({ error: 'Acceso Denegado. Token requerido.' });
  }

  // Desencriptar token a URL real
  const decryptedUrl = cryptoUtils.decrypt(token);
  
  if (!decryptedUrl) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }

  // Si es un playlist (.m3u8), lo procesamos con Axios
  if (decryptedUrl.includes('.m3u8')) {
    try {
      await hlsProxyService.proxyPlaylist(decryptedUrl, res);
    } catch (error) {
      next(error);
    }
  } else {
    // Si es un segmento (.ts), lo pasamos al proxy de streaming continuo
    // Guardamos la url real en req para que el middleware de C++ pueda leerla
    req.realTargetUrl = decryptedUrl; 
    next();
  }
});

// Middleware de Proxy para Streaming de Segmentos (.ts)
router.use('/hls-proxy', createProxyMiddleware({
  target: 'http://placeholder.com', 
  router: (req) => {
    if (!req.realTargetUrl) return 'http://placeholder.com';
    const target = new URL(req.realTargetUrl);
    return target.origin;
  },
  pathRewrite: (path, req) => {
    if (!req.realTargetUrl) return path;
    const target = new URL(req.realTargetUrl);
    return target.pathname + target.search;
  },
  changeOrigin: true,
  proxyTimeout: 15000,
  timeout: 15000,
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Cabeceras exigidas por el servidor de origen
      proxyReq.setHeader('User-Agent', env.UPSTREAM_USER_AGENT);
      proxyReq.setHeader('Referer', env.UPSTREAM_REFERER || 'https://la14hd.com/');
      proxyReq.setHeader('Origin', 'https://la14hd.com');
      proxyReq.setHeader('Connection', 'close');
    },
    proxyRes: (proxyRes, req, res) => {
      // Configuraciones para el Player (P2P / CORS)
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Cache-Control'] = 'public, max-age=3600';
      proxyRes.headers['Content-Type'] = 'video/mp2t';
    },
    error: (err, req, res) => {
      logger.error('Streaming Proxy Error: ' + err.message);
      if (!res.headersSent) {
          res.status(500).send('Streaming Proxy Fallback Error');
      }
    }
  }
}));

module.exports = router;
