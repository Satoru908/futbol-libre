const axios = require('axios');
const logger = require('../utils/logger');

class M3U8ProxyService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://la14hd.com/',
      'Origin': 'https://la14hd.com',
      'Accept': '*/*'
    };
  }

  async extractM3U8Url(providerUrl) {
    try {
      const response = await axios.get(providerUrl, {
        headers: this.headers,
        timeout: 10000
      });

      const html = response.data;
      const m3u8Url = this._parseM3U8FromHTML(html);

      if (!m3u8Url) {
        throw new Error('No se encontró URL M3U8 en el HTML');
      }

      logger.info(`M3U8 URL extraída: ${m3u8Url}`);
      return m3u8Url;

    } catch (error) {
      logger.error('Error extrayendo M3U8:', error.message);
      throw error;
    }
  }

  async proxyM3U8Content(m3u8Url) {
    try {
      const response = await axios.get(m3u8Url, {
        headers: this.headers,
        timeout: 10000
      });

      return response.data;

    } catch (error) {
      logger.error('Error obteniendo contenido M3U8:', error.message);
      throw error;
    }
  }

  _parseM3U8FromHTML(html) {
    const patterns = [
      /var playbackURL = ["']([^"']+\.m3u8[^"']*)["']/,
      /source:\s*["']([^"']+\.m3u8[^"']*)["']/,
      /src:\s*["']([^"']+\.m3u8[^"']*)["']/,
      /https?:\/\/[^"'\s]+\.m3u8[^\s"']*/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }
}

module.exports = new M3U8ProxyService();
