/**
 * HTML Sanitizer Service
 * 
 * Servicio responsable de gestionar la sanitización de HTML desde proveedores terceros.
 * Implementa caché, manejo de errores y logging estructurado.
 * 
 * Responsabilidades:
 * - Orchestrar la sanitización de HTML
 * - Gestionar caché de HTML limpio
 * - Validar entrada de datos
 * - Registrar operaciones en logs
 */

const scriptSanitizer = require('../utils/script-sanitizer.util');
const logger = require('../utils/logger');

class HtmlSanitizerService {
  constructor() {
    // Cache para HTML ya sanitizado
    // Estructura: { streamId: { html, timestamp, expiresAt } }
    this.sanitizedCache = new Map();
    
    // TTL para el HTML sanitizado (30 minutos)
    // Nota: Es mayor que el HTML original porque la sanitización es un proceso costoso
    this.CACHE_TTL = 30 * 60 * 1000;
  }

  /**
   * Valida que el HTML sea válido
   * @param {string} html - HTML a validar
   * @returns {boolean} - true si es válido
   */
  isValidHtmlContent(html) {
    if (!html) return false;
    if (typeof html !== 'string') return false;
    if (html.length < 100) return false; // HTML muy corto es sospechoso
    if (!html.includes('<')) return false; // No contiene etiquetas HTML

    return true;
  }

  /**
   * Obtiene HTML sanitizado desde caché si existe y es válido
   * @param {string} streamId - ID del stream
   * @returns {object|null} - HTML sanitizado o null si no existe o expiró
   */
  getFromCache(streamId) {
    const cached = this.sanitizedCache.get(streamId);

    if (!cached) {
      return null;
    }

    // Verificar si el caché ha expirado
    if (cached.expiresAt < Date.now()) {
      this.sanitizedCache.delete(streamId);
      logger.info(`Caché expirado para stream: ${streamId}`);
      return null;
    }

    logger.info(`Entregando HTML sanitizado desde caché para stream: ${streamId}`);
    return cached;
  }

  /**
   * Guarda HTML sanitizado en caché
   * @param {string} streamId - ID del stream
   * @param {string} sanitizedHtml - HTML limpio
   */
  saveToCache(streamId, sanitizedHtml) {
    this.sanitizedCache.set(streamId, {
      html: sanitizedHtml,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });

    logger.info(`HTML sanitizado guardado en caché para stream: ${streamId}`);
  }

  /**
   * Limpia la entrada del caché de un stream específico
   * Útil para forzar re-sanitización
   * @param {string} streamId - ID del stream
   */
  clearCache(streamId) {
    if (this.sanitizedCache.has(streamId)) {
      this.sanitizedCache.delete(streamId);
      logger.info(`Caché limpiado para stream: ${streamId}`);
    }
  }

  /**
   * Limpia todo el caché de HTML sanitizado
   * Útil después de actualizaciones de patrones de sanitización
   */
  clearAllCache() {
    const size = this.sanitizedCache.size;
    this.sanitizedCache.clear();
    logger.warn(`Caché completo limpiado (${size} entradas eliminadas)`);
  }

  /**
   * Método principal: Obtiene y sanitiza HTML de un stream
   * 
   * Flujo:
   * 1. Busca en caché primero
   * 2. Si no existe, llama al provider para obtener HTML
   * 3. Valida el HTML
   * 4. Sanitiza mediante scriptSanitizer
   * 5. Guarda en caché y retorna
   * 
   * @param {string} streamId - ID del stream
   * @param {function} htmlProvider - Función que obtiene el HTML (ej: la14Provider.fetchHtml)
   * @returns {Promise<string>} - HTML sanitizado o string vacío si falla
   */
  async sanitizeStream(streamId, htmlProvider) {
    try {
      // Validar entrada
      if (!streamId || typeof streamId !== 'string') {
        logger.error('streamId inválido recibido en sanitizeStream');
        return '';
      }

      if (typeof htmlProvider !== 'function') {
        logger.error('htmlProvider debe ser una función');
        return '';
      }

      // Paso 1: Verificar caché
      const cachedResult = this.getFromCache(streamId);
      if (cachedResult) {
        return cachedResult.html;
      }

      // Paso 2: Obtener HTML del provider
      logger.info(`Obteniendo HTML del provider para stream: ${streamId}`);
      const rawHtml = await htmlProvider(streamId);

      // Validar que el provider devolvió HTML válido
      if (!this.isValidHtmlContent(rawHtml)) {
        logger.error(`Provider devolvió HTML inválido para stream: ${streamId}`);
        return '';
      }

      // Paso 3 & 4: Sanitizar HTML
      logger.info(`Sanitizando HTML para stream: ${streamId}`);
      const sanitizedHtml = scriptSanitizer.sanitize(rawHtml);

      // Validar que la sanitización no eliminó todo el contenido
      if (!this.isValidHtmlContent(sanitizedHtml)) {
        logger.error(`HTML resultante es inválido después de sanitización para stream: ${streamId}`);
        return rawHtml; // Retornar HTML original como fallback
      }

      // Paso 5: Guardar en caché
      this.saveToCache(streamId, sanitizedHtml);

      return sanitizedHtml;

    } catch (error) {
      logger.error(`Error en sanitizeStream para stream ${streamId}:`, error.message);
      return '';
    }
  }

  /**
   * Obtiene estadísticas del caché
   * Útil para monitoreo
   * @returns {object} - Estadísticas del caché
   */
  getCacheStats() {
    const size = this.sanitizedCache.size;
    const totalMemory = Array.from(this.sanitizedCache.values()).reduce(
      (sum, item) => sum + item.html.length,
      0
    );

    return {
      cacheSize: size,
      totalMemory: `${(totalMemory / 1024).toFixed(2)} KB`,
      cacheTTL: `${this.CACHE_TTL / 1000 / 60} minutos`
    };
  }
}

// Exportar como singleton
module.exports = new HtmlSanitizerService();
