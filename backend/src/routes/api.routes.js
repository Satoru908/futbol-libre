const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const env = require('../config/env');
const la14Provider = require('../providers/la14hd.provider');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'futbol-libre-api', 
    timestamp: Date.now(),
    architecture: 'cors-proxy-client-scraper'
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


module.exports = router;
