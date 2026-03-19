/**
 * Servicio de Caché de Segmentos
 * 
 * Cachea segmentos .ts en memoria para reducir peticiones a fubohd.com
 * y ancho de banda de Railway.
 */

const logger = require('../utils/logger');

class SegmentCacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Máximo 100 segmentos en caché (~200 MB)
    this.ttl = 60 * 1000; // 60 segundos (los segmentos son válidos por poco tiempo)
  }

  /**
   * Obtiene un segmento del caché
   */
  get(url) {
    const cached = this.cache.get(url);
    
    if (!cached) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(url);
      logger.debug(`[SegmentCache] Expirado: ${url}`);
      return null;
    }

    logger.debug(`[SegmentCache] Hit: ${url}`);
    return cached.data;
  }

  /**
   * Guarda un segmento en el caché
   */
  set(url, data) {
    // Si el caché está lleno, eliminar el más antiguo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      logger.debug(`[SegmentCache] Evicted: ${firstKey}`);
    }

    this.cache.set(url, {
      data: data,
      expiresAt: Date.now() + this.ttl,
      cachedAt: Date.now()
    });

    logger.debug(`[SegmentCache] Cached: ${url} (size: ${this.cache.size})`);
  }

  /**
   * Limpia segmentos expirados
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [url, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(url);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[SegmentCache] Cleaned ${cleaned} expired segments`);
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      memoryUsage: this.cache.size * 2 // ~2 MB por segmento
    };
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.warn(`[SegmentCache] Cleared all cache (${size} segments)`);
  }
}

// Singleton
const segmentCache = new SegmentCacheService();

// Limpiar caché cada 5 minutos
setInterval(() => {
  segmentCache.cleanup();
}, 5 * 60 * 1000);

module.exports = segmentCache;
