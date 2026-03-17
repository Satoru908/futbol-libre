const axios = require('axios');
const env = require('../config/env');
const la14Provider = require('../providers/la14hd.provider');
const logger = require('../utils/logger');

class StreamUrlService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Obtiene la URL real del stream para un ID dado
   */
  async resolveStreamUrl(streamId) {
    logger.info(`Resolviendo URL para stream: ${streamId}`);
    
    // Revisar caché
    const cached = this._getFromCache(streamId);
    if (cached) {
      logger.info(`Retornando stream desde caché: ${streamId}`);
      return this._buildResponse(streamId, cached.url, cached.expiresAt);
    }

    // Intentar obtener de variables de entorno
    let upstreamUrl = env.getStreamUrl(streamId);

    // Si no hay override, usar provider
    if (!upstreamUrl) {
      upstreamUrl = await la14Provider.resolve(streamId);
    }

    if (!upstreamUrl) {
      throw new Error('No se pudo resolver la URL del stream');
    }

    // Guardar en caché
    const expiresAt = Date.now() + (60 * 60 * 1000);
    this._saveToCache(streamId, upstreamUrl);

    return this._buildResponse(streamId, upstreamUrl, expiresAt);
  }

  /**
   * Obtiene stream desde caché si existe y no ha expirado
   */
  _getFromCache(streamId) {
    const cached = this.cache.get(streamId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    return null;
  }

  /**
   * Guarda stream en caché
   */
  _saveToCache(streamId, url) {
    this.cache.set(streamId, { 
      url, 
      expiresAt: Date.now() + this.CACHE_TTL 
    });
  }

  /**
   * Construye respuesta estandarizada
   */
  _buildResponse(streamId, url, expiresAt) {
    return {
      streamId,
      url,
      expiresAt
    };
  }

  /**
   * Limpia caché expirado
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new StreamUrlService();
