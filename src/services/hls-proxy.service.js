/**
 * HLS Proxy Service - Local Middleware
 * 
 * ESTRATEGIA PARA IP BINDING:
 * 
 * 1. Playlists (.m3u8):
 *    - Descarga mediante Axios y se sobrescribe.
 *    - Asegura la generación del Token con IP Backend.
 * 
 * 2. Segmentos (.ts):
 *    - Se delegan al middleware súper liviano 'http-proxy-middleware'.
 *    - Todas las descargas de un usuario pasan por este Backend, asegurando IP.
 *    - Se balanceará la carga gracias a P2P Media Loader en los clientes.
 * 
 * 3. Encriptación (NUEVO):
 *    - Las rutas apuntan al token 'q', ocultando la URL original en F12.
 */

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const cryptoUtils = require('../utils/crypto'); // <-- Importar encriptación

class HlsProxyService {
  /**
   * Solo procesa Playlists HLS (.m3u8)
   */
  async proxyPlaylist(originalUrl, res) {
    try {
      logger.info(`Proxying playlist: ${originalUrl.substring(0, 60)}...`);

      const response = await axios.get(originalUrl, {
        headers: this._getUpstreamHeaders(),
        responseType: 'text',
        timeout: 10000
      });

      const rewrittenPlaylist = this._rewritePlaylist(response.data, originalUrl);

      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Layer': 'Backend-Local'
      });
      
      return res.send(rewrittenPlaylist);

    } catch (error) {
      logger.error(`Error en proxyPlaylist: ${error.message}`);
      return res.status(error.response?.status || 500).send('Error procesando la lista de reproducción');
    }
  }

  /**
   * Cabeceras de simulación para el servidor de origen
   */
  _getUpstreamHeaders() {
    return {
      'User-Agent': env.UPSTREAM_USER_AGENT,
      'Referer': env.UPSTREAM_REFERER || 'https://la14hd.com/',
      'Origin': 'https://la14hd.com',
      'Accept': '*/*'
    };
  }

  /**
   * Lógica de reescritura de lista de reproducción local.
   * Dirige TODAS las peticiones (.ts y .m3u8 sub-listas) al puerto base /hls-proxy del servidor actual
   */
  _rewritePlaylist(content, originalUrl) {
    const urlObj = new URL(originalUrl);
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
    const queryParams = urlObj.search;

    return content
      .split('\n')
      .map(line => this._processPlaylistLine(line, baseUrl, queryParams))
      .join('\n');
  }

  /**
   * Procesa cada línea de la playlist
   */
  _processPlaylistLine(line, baseUrl, queryParams) {
    const trimmedLine = line.trim();
    
    // Ignorar comentarios y líneas vacías
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return line;
    }

    // Resolver URL absoluta de forma robusta
    let absoluteUrl = trimmedLine;
    try {
      if (!absoluteUrl.startsWith('http')) {
        absoluteUrl = new URL(absoluteUrl, baseUrl).toString();
        // Mantener tokens si el segmento no los tiene
        if (!absoluteUrl.includes('?') && queryParams) {
          absoluteUrl += queryParams;
        }
      }
    } catch (e) {
      logger.error(`Error resolviendo URL: ${trimmedLine}`);
      return line;
    }

    // Encriptar la URL para el playlist o segmento
    const encryptedToken = cryptoUtils.encrypt(absoluteUrl);

    // Todo pasa por el backend (encriptado para no verse en F12)
    return `/api/hls-proxy?q=${encodeURIComponent(encryptedToken)}`;
  }
}

module.exports = new HlsProxyService();
