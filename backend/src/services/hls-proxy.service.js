/**
 * HLS Proxy Service
 * Maneja el proxy de playlists y segmentos HLS
 * 
 * NOTA: Este servicio se usa temporalmente mientras se resuelven
 * los problemas de bloqueo de IPs de Cloudflare Workers por parte
 * de los servidores upstream (error 403).
 */

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class HlsProxyService {
  /**
   * Proxy para listas de reproducción .m3u8
   * Reescribe las URLs internas para que también pasen por el proxy
   */
  async proxyPlaylist(originalUrl, res) {
    try {
      const response = await axios.get(originalUrl, {
        headers: this._getUpstreamHeaders(),
        responseType: 'text',
        timeout: 10000
      });

      const playlistContent = response.data;
      const rewrittenPlaylist = this._rewritePlaylist(playlistContent, originalUrl);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(rewrittenPlaylist);

    } catch (error) {
      logger.error('Error proxying playlist:', error.message);
      res.status(500).send('Error proxying playlist');
    }
  }

  /**
   * Proxy para segmentos .ts (video binary)
   */
  async proxySegment(segmentUrl, res) {
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
   * Reescribe URLs en playlist para que pasen por el proxy
   */
  _rewritePlaylist(content, originalUrl) {
    const originalUrlObj = new URL(originalUrl);
    const originalSearchParams = originalUrlObj.search;
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);

    return content
      .split('\n')
      .map(line => this._rewriteLine(line, baseUrl, originalSearchParams))
      .join('\n');
  }

  /**
   * Reescribe una línea de la playlist
   */
  _rewriteLine(line, baseUrl, originalSearchParams) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      return line;
    }

    let segmentUrl = line.trim();
    
    // Resolver rutas relativas
    if (!segmentUrl.startsWith('http')) {
      segmentUrl = new URL(segmentUrl, baseUrl).toString();
      
      // Propagar query params (token) si es necesario
      if (segmentUrl.indexOf('?') === -1 && originalSearchParams) {
        segmentUrl += originalSearchParams;
      }
    }

    return `/api/hls-proxy?url=${encodeURIComponent(segmentUrl)}`;
  }
}

module.exports = new HlsProxyService();
