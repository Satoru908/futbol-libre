const axios = require('axios');
const logger = require('../utils/logger');
const urlValidator = require('../utils/url-validator');

class La14HdProvider {
    constructor() {
        this.baseUrl = 'https://la14hd.com/vivo/canales.php';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://la14hd.com/'
        };
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
