const axios = require('axios');
const logger = require('../utils/logger');
const urlValidator = require('../utils/url-validator');
const env = require('../config/env');

class La14HdProvider {
    constructor() {
        this.baseUrl = env.PROVIDER_BASE_URL;
        this.headers = {
            'User-Agent': env.PROVIDER_USER_AGENT,
            'Referer': env.PROVIDER_REFERER
        };
        this.htmlCache = new Map();
        this.CACHE_TTL = env.CACHE_TTL; // desde env.js
    }

    async fetchHtml(streamId) {
        try {
            // NO cachear HTML: siempre obtener fresco para que el token sea nuevo
            logger.info(`Obteniendo HTML puro FRESCO (sin caché) para: ${streamId}`);
            const response = await axios.get(`${this.baseUrl}?stream=${streamId}`, {
                headers: this.headers,
                timeout: 10000
            });
            
            return response.data;
        } catch (error) {
            logger.error(`Error obteniendo HTML de stream ${streamId}:`, error.message);
            return null;
        }
    }

    async resolve(streamId) {
        try {
            logger.info(`Resolviendo stream desde provider: ${streamId}`);
            
            const response = await axios.get(`${this.baseUrl}?stream=${streamId}`, {
                headers: this.headers,
                timeout: 10000
            });
            const html = response.data;

            // Buscar URL .m3u8 en el HTML
            const streamUrl = this._extractM3u8Url(html) || this._extractBase64Url(html);

            if (streamUrl && urlValidator.isValid(streamUrl)) {
                logger.info(`Stream resuelto exitosamente para: ${streamId}`);
                return streamUrl;
            }

            logger.warn(`No se encontró URL válida para stream: ${streamId}`);
            return null;

        } catch (error) {
            logger.error(`Error resolviendo stream ${streamId}:`, error.message);
            return null;
        }
    }

    /**
     * Extrae URL .m3u8 del HTML usando regex
     */
    _extractM3u8Url(html) {
        const m3u8Regex = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/;
        const match = html.match(m3u8Regex);
        return match ? match[1] : null;
    }

    /**
     * Extrae y decodifica URL base64 del HTML
     */
    _extractBase64Url(html) {
        const atobRegex = /atob\s*\(\s*["']([^"']+)["']\s*\)/;
        const match = html.match(atobRegex);
        
        if (match && match[1]) {
            try {
                const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
                if (decoded.includes('.m3u8')) {
                    return decoded;
                }
            } catch (e) {
                logger.error('Error decodificando base64:', e.message);
            }
        }
        
        return null;
    }
}

module.exports = new La14HdProvider();
