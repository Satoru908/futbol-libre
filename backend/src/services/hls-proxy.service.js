/**
 * HLS Proxy Service - Arquitectura Híbrida
 * 
 * ESTRATEGIA PRO PARA ESCALAR A MILES DE USUARIOS:
 * 
 * 1. Backend descarga PLAYLISTS (.m3u8):
 *    - Solo texto (KB), no satura el servidor
 *    - IP limpia, no bloqueada por upstream (evita 403)
 *    - Valida tokens y autenticación
 * 
 * 2. Backend reescribe URLs de SEGMENTOS (.ts):
 *    - Apuntan a Cloudflare Worker
 *    - Worker maneja GB de tráfico (escala infinito)
 *    - Upstream no bloquea segmentos (demasiado trabajo)
 * 
 * RESULTADO:
 * - Backend: Solo procesa KB → Aguanta miles de usuarios
 * - Cloudflare: Procesa GB → Gratis y escala infinito
 * - Sin error 403: Playlist desde IP limpia
 */

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class HlsProxyService {
  /**
   * Proxy HÍBRIDO para playlists .m3u8
   * Backend descarga playlist, reescribe URLs para que segmentos pasen por Cloudflare
   */
  async proxyPlaylist(originalUrl, res) {
    try {
      // Backend descarga playlist con IP limpia (evita 403)
      const response = await axios.get(originalUrl, {
        headers: this._getUpstreamHeaders(),
        responseType: 'text',
        timeout: 10000
      });

      const playlistContent = response.data;
      
      // Reescribir URLs: segmentos → Cloudflare, playlists → Backend
      const rewrittenPlaylist = this._rewritePlaylistHybrid(playlistContent, originalUrl);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(rewrittenPlaylist);

    } catch (error) {
      logger.error('Error proxying playlist:', error.message);
      res.status(500).send('Error proxying playlist');
    }
  }

  /**
   * DEPRECADO: Los segmentos ahora pasan por Cloudflare Worker
   * Este método solo se usa como fallback si Cloudflare falla
   */
  async proxySegment(segmentUrl, res) {
    logger.warn('Usando fallback de segmento (debería pasar por Cloudflare)');
    
    try {
      const response = await axios({
        method: 'get',
        url: segmentUrl,
        headers: this._getUpstreamHeaders(),
        responseType: 'stream',
        timeout: 15000,
        validateStatus: (status) => status < 400
      });

      if (response.status >= 400) {
        logger.error(`Upstream error: ${response.status}`);
        return res.status(response.status).send('Upstream Error');
      }

      const contentType = response.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      response.data.pipe(res);

    } catch (error) {
      logger.error('Error proxying segment:', error.message);
      res.status(500).end();
    }
  }

  /**
   * Obtiene headers para requests upstream
   */
  _getUpstreamHeaders() {
    return {
      'User-Agent': env.UPSTREAM_USER_AGENT,
      'Referer': env.UPSTREAM_REFERER || 'https://la14hd.com/',
      'Origin': 'https://la14hd.com'
    };
  }

  /**
   * ARQUITECTURA HÍBRIDA: Reescribe playlist para usar Cloudflare en segmentos
   * 
   * Estrategia:
   * - Playlists (.m3u8) → Backend (este servidor)
   * - Segmentos (.ts, .key, etc) → Cloudflare Worker
   */
  _rewritePlaylistHybrid(content, originalUrl) {
    const originalUrlObj = new URL(originalUrl);
    const originalSearchParams = originalUrlObj.search;
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);

    return content
      .split('\n')
      .map(line => this._rewriteLineHybrid(line, baseUrl, originalSearchParams))
      .join('\n');
  }

  /**
   * Reescribe una línea usando arquitectura híbrida
   */
  _rewriteLineHybrid(line, baseUrl, originalSearchParams) {
    const trimmed = line.trim();
    
    // Ignorar líneas vacías y comentarios
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    // Construir URL absoluta
    let absoluteUrl = trimmed;
    if (!absoluteUrl.startsWith('http')) {
      absoluteUrl = new URL(absoluteUrl, baseUrl).toString();
      
      // Propagar query params (token) si es necesario
      if (!absoluteUrl.includes('?') && originalSearchParams) {
        absoluteUrl += originalSearchParams;
      }
    }

    // DECISIÓN INTELIGENTE:
    // - Si es playlist (.m3u8) → Backend (IP limpia, evita 403)
    // - Si es segmento (.ts, .key, etc) → Cloudflare (escala infinito)
    
    if (absoluteUrl.includes('.m3u8')) {
      // Playlists pasan por backend (IP limpia)
      return `/api/hls-proxy?url=${encodeURIComponent(absoluteUrl)}`;
    } else {
      // Segmentos pasan por Cloudflare Worker (escala infinito)
      const workerUrl = env.CLOUDFLARE_WORKER_URL;
      
      if (workerUrl) {
        return `${workerUrl}?url=${encodeURIComponent(absoluteUrl)}`;
      } else {
        // Fallback: si no hay worker configurado, usar backend
        logger.warn('CLOUDFLARE_WORKER_URL no configurado, usando backend para segmentos');
        return `/api/hls-proxy?url=${encodeURIComponent(absoluteUrl)}`;
      }
    }
  }
}

module.exports = new HlsProxyService();
