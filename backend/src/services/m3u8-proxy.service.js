const axios = require('axios');
const logger = require('../utils/logger');
const streamtpProvider = require('../providers/streamtpnew.provider');

/**
 * Servicio de proxy para M3U8 y segmentos .ts
 * 
 * Arquitectura:
 * 1. Usuario solicita M3U8 a Railway
 * 2. Railway descarga M3U8 desde streameasthd.net (con IP válida)
 * 3. Railway reescribe las URLs para que apunten al proxy
 * 4. Usuario descarga segmentos .ts a través de Railway
 */
class M3U8ProxyService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://streamtp10.com/',
      'Origin': 'https://streamtp10.com',
      'Accept': '*/*'
    };
    
    // Cache de URLs M3U8 (válidas por 15 horas según streamtp10.com)
    this.m3u8Cache = new Map();
    this.CACHE_DURATION = 14 * 60 * 60 * 1000; // 14 horas
  }

  /**
   * Obtiene la URL M3U8 original (con cache)
   */
  async getM3U8Url(streamId) {
    const cached = this.m3u8Cache.get(streamId);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      logger.info(`[M3U8 PROXY] Usando M3U8 cacheado para ${streamId}`);
      return cached.url;
    }
    
    logger.info(`[M3U8 PROXY] Obteniendo nuevo M3U8 para ${streamId}`);
    const url = await streamtpProvider.getM3U8Url(streamId);
    
    this.m3u8Cache.set(streamId, {
      url: url,
      timestamp: Date.now()
    });
    
    return url;
  }

  /**
   * Descarga el contenido del M3U8 master y reescribe las URLs
   * 
   * Equivalente Python:
   * for linea in respuesta_original.split("\n"):
   *   if linea.endswith(".m3u8"):
   *     nueva_lista.append(f"/api/m3u8-variant?stream={stream}&url={linea}")
   */
  async proxyM3U8Master(streamId, baseProxyUrl) {
    try {
      const m3u8Url = await this.getM3U8Url(streamId);
      
      logger.info(`[M3U8 PROXY] Descargando master M3U8: ${m3u8Url}`);
      
      const response = await axios.get(m3u8Url, {
        headers: this.headers,
        timeout: 15000
      });

      let content = response.data;
      
      // Extraer la base URL del M3U8 original
      const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
      
      // Reescribir URLs relativas a través del proxy
      // Esto es como el ejemplo Python: nueva_lista.append(f"/proxy?ts={linea}")
      content = content.replace(/^([^#\n][^\n]*\.m3u8[^\n]*)$/gm, (match) => {
        const fullUrl = match.startsWith('http') ? match : baseUrl + match;
        return `${baseProxyUrl}/api/m3u8-variant?stream=${streamId}&url=${encodeURIComponent(fullUrl)}`;
      });

      logger.info(`[M3U8 PROXY] Master M3U8 procesado para ${streamId}`);
      return content;

    } catch (error) {
      logger.error(`[M3U8 PROXY] Error en proxyM3U8Master: ${error.message}`);
      throw error;
    }
  }

  /**
   * Descarga el contenido de una variante M3U8 y reescribe las URLs de segmentos
   * 
   * Equivalente Python:
   * for linea in respuesta_original.split("\n"):
   *   if linea.endswith(".ts"):
   *     nueva_lista.append(f"/proxy?ts={linea}")
   */
  async proxyM3U8Variant(variantUrl, streamId, baseProxyUrl) {
    try {
      logger.info(`[M3U8 PROXY] Descargando variante M3U8: ${variantUrl.substring(0, 80)}...`);
      
      const response = await axios.get(variantUrl, {
        headers: this.headers,
        timeout: 15000
      });

      let content = response.data;
      
      // Extraer la base URL de la variante
      const baseUrl = variantUrl.substring(0, variantUrl.lastIndexOf('/') + 1);
      
      // Reescribir URLs de segmentos .ts a través del proxy
      // Esto es exactamente como el ejemplo Python
      content = content.replace(/^([^#\n][^\n]*\.ts[^\n]*)$/gm, (match) => {
        const fullUrl = match.startsWith('http') ? match : baseUrl + match;
        return `${baseProxyUrl}/api/segment?stream=${streamId}&url=${encodeURIComponent(fullUrl)}`;
      });

      logger.info(`[M3U8 PROXY] Variante M3U8 procesada`);
      return content;

    } catch (error) {
      logger.error(`[M3U8 PROXY] Error en proxyM3U8Variant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Descarga un segmento .ts
   * 
   * Este es el endpoint /proxy del ejemplo Python
   * Descarga el fragmento de video y lo sirve al usuario
   */
  async proxySegment(segmentUrl) {
    try {
      const response = await axios.get(segmentUrl, {
        headers: this.headers,
        timeout: 20000,
        responseType: 'arraybuffer'
      });

      return response.data;

    } catch (error) {
      logger.error(`[M3U8 PROXY] Error descargando segmento: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new M3U8ProxyService();
