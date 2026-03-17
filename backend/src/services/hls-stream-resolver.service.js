/**
 * HLS Stream Resolver Service
 * 
 * Extrae la URL del stream de HLS desde el HTML sanitizado
 * para obtener siempre un token fresco.
 * 
 * En lugar de usar el HTML con token expirado, extrae la URL
 * y la retorna para que el frontend use un reproductor propio.
 */

const axios = require('axios');
const logger = require('../utils/logger');

class HlsStreamResolver {
    constructor() {
        this.streamCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos (menos que el token de 5 horas)
    }

    /**
     * Extrae la URL del stream (playbackURL) desde el HTML
     * @param {string} html - HTML del reproductor
     * @returns {string|null} - URL del stream o null si no encuentra
     */
    extractStreamUrl(html) {
        try {
            // Buscar patrón: var playbackURL = "...";
            const match = html.match(/var\s+playbackURL\s*=\s*["']([^"']+)["']/);
            
            if (match && match[1]) {
                logger.info('Stream URL extraída exitosamente');
                return match[1];
            }

            logger.warn('No se encontró playbackURL en HTML');
            return null;
        } catch (error) {
            logger.error('Error extrayendo stream URL:', error.message);
            return null;
        }
    }

    /**
     * Obtiene la URL del stream con token fresco
     * @param {string} streamId - ID del stream
     * @param {function} htmlProvider - Función que obtiene el HTML
     * @returns {Promise<string>} - URL del stream o string vacío si falla
     */
    async getStreamUrl(streamId, htmlProvider) {
        try {
            // Verificar caché
            const cached = this.streamCache.get(streamId);
            if (cached && cached.expiresAt > Date.now()) {
                logger.info(`Stream URL desde caché para: ${streamId}`);
                return cached.url;
            }

            // Obtener HTML fresco
            logger.info(`Obteniendo HTML fresco para extraer stream URL: ${streamId}`);
            const html = await htmlProvider(streamId);

            if (!html) {
                logger.error(`HTML vacío para stream: ${streamId}`);
                return '';
            }

            // Extraer URL
            const streamUrl = this.extractStreamUrl(html);
            
            if (!streamUrl) {
                logger.error(`No se pudo extraer URL para stream: ${streamId}`);
                return '';
            }

            // Guardar en caché
            this.streamCache.set(streamId, {
                url: streamUrl,
                expiresAt: Date.now() + this.CACHE_TTL
            });

            logger.info(`Stream URL en caché para stream: ${streamId}`);
            return streamUrl;

        } catch (error) {
            logger.error(`Error obteniendo stream URL para ${streamId}:`, error.message);
            return '';
        }
    }

    /**
     * Limpia caché de un stream específico
     */
    clearCache(streamId) {
        if (this.streamCache.has(streamId)) {
            this.streamCache.delete(streamId);
            logger.info(`Caché de stream limpiado: ${streamId}`);
        }
    }

    /**
     * Limpia todo el caché
     */
    clearAllCache() {
        const size = this.streamCache.size;
        this.streamCache.clear();
        logger.warn(`Caché de streams limpiado (${size} entradas)`);
    }
}

module.exports = new HlsStreamResolver();
