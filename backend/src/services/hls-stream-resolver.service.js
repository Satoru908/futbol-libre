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
        this.CACHE_TTL = 2 * 60 * 1000; // 2 minutos (Token FuboHD ~20min, caché corto para frescura)
    }

    /**
     * Extrae la fecha de expiración del token de la URL
     * Formato del token: HASH-XX-EXPIRATION_TS-ISSUED_TS
     * Ej: 7a328aa18534537476753a2843da8a494fb1a02f-d4-1773784638-1773766638
     */
    extractTokenExpiration(url) {
        try {
            if (!url || typeof url !== 'string') {
                logger.warn('URL inválida o vacía para extraer token');
                return null;
            }

            const tokenMatch = url.match(/token=([^&]+)/);
            if (!tokenMatch || !tokenMatch[1]) {
                logger.warn('No se encontró token en URL');
                return null;
            }

            const token = tokenMatch[1];
            const parts = token.split('-');
            
            // Formato esperado: HASH(40 chars)-XX(2 chars)-EXPIRATION(10 digits)-ISSUED(10 digits)
            if (parts.length < 4) {
                logger.warn(`Formato de token inválido (${parts.length} partes): ${token}`);
                return null;
            }

            // Acceder a la parte antes de la última (EXPIRATION)
            const expirationSeconds = parseInt(parts[parts.length - 2], 10);
            
            if (isNaN(expirationSeconds) || expirationSeconds < 1000000000) {
                logger.warn(`Expiración inválida: ${parts[parts.length - 2]}`);
                return null;
            }

            const expirationMs = expirationSeconds * 1000;
            logger.info(`Token expira en ${new Date(expirationMs).toISOString()}`);
            return expirationMs;

        } catch (error) {
            logger.error('Error extrayendo expiración del token:', error.message);
            return null;
        }
    }

    /**
     * Verifica si el token tiene al menos minutos de vida restante
     */
    isTokenValid(url, minMinutesRemaining = 10) {
        try {
            if (!url || typeof url !== 'string') {
                logger.warn('URL inválida para validar token');
                return false;
            }

            const expirationMs = this.extractTokenExpiration(url);
            
            if (!expirationMs) {
                logger.info('No se pudo extraer expiración, considerando token inválido');
                return false;
            }

            const now = Date.now();
            const remainingMs = expirationMs - now;
            const remainingMinutes = remainingMs / (60 * 1000);

            logger.info(`Token vence en ${remainingMinutes.toFixed(1)} minutos`);
            
            if (remainingMs <= 0) {
                logger.warn('Token ya expiró');
                return false;
            }

            if (remainingMinutes < minMinutesRemaining) {
                logger.warn(`Token vence muy pronto (${remainingMinutes.toFixed(1)} min). No se cachea.`);
                return false;
            }

            logger.info('Token válido para cachear');
            return true;

        } catch (error) {
            logger.error('Error validando token:', error.message);
            return false;
        }
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
     * Obtiene la URL del stream con token fresco Y headers necesarios
     * @param {string} streamId - ID del stream
     * @param {function} htmlProvider - Función que obtiene el HTML
     * @returns {Promise<object>} - Objeto {url, headers} o null si falla
     */
    async getStreamUrl(streamId, htmlProvider) {
        try {
            // Verificar caché
            const cached = this.streamCache.get(streamId);
            if (cached && cached.expiresAt > Date.now()) {
                logger.info(`Stream URL desde caché para: ${streamId}`);
                return {
                    url: cached.url,
                    headers: cached.headers || this._getDefaultHeaders()
                };
            }

            // Obtener HTML fresco
            logger.info(`Obteniendo HTML fresco para extraer stream URL: ${streamId}`);
            const html = await htmlProvider(streamId);

            if (!html) {
                logger.error(`HTML vacío para stream: ${streamId}`);
                return null;
            }

            // Extraer URL
            const streamUrl = this.extractStreamUrl(html);
            
            if (!streamUrl) {
                logger.error(`No se pudo extraer URL para stream: ${streamId}`);
                return null;
            }

            // Headers necesarios para acceder al stream desde cualquier origen
            const headers = this._getDefaultHeaders();

            // VALIDAR TOKEN: Solo cachear si tiene >10 minutos de vida
            // Si no se puede validar el token, igualmente devolver URL (frontend manejará reintentos si es necesario)
            const isTokenValid = this.isTokenValid(streamUrl, 10);

            if (isTokenValid) {
                // Cachear solo si el token es válido
                this.streamCache.set(streamId, {
                    url: streamUrl,
                    headers: headers,
                    expiresAt: Date.now() + this.CACHE_TTL
                });
                logger.info(`Stream URL en caché (token válido) para: ${streamId}`);
            } else {
                logger.warn(`Token inválido/próximo a expirar o no se pudo validar. Devolviendo URL sin cachear para: ${streamId}`);
            }

            return {
                url: streamUrl,
                headers: headers
            };

        } catch (error) {
            logger.error(`Error obteniendo stream URL para ${streamId}:`, error.message);
            logger.error('Stack trace:', error.stack);
            return null;
        }
    }

    /**
     * Headers por defecto para acceder a la URL del stream
     */
    _getDefaultHeaders() {
        return {
            'Referer': 'https://streamtp10.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://streamtp10.com'
        };
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
