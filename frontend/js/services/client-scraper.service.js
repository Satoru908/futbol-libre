/**
 * Servicio para realizar Client-Side Scraping
 * Descarga HTML crudo a través de nuestro CORS proxy de HuggingFace
 * y extrae la URL del stream M3U8 localmente en el navegador.
 */

export class ClientScraperService {
    constructor(baseUrl = 'http://localhost:8787/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Obtiene y parsea la URL del stream para un ID
     */
    async getResolvedStream(streamId, provider = 'la14hd') {
        try {
            console.log(`Iniciando client-side scraping para stream: ${streamId}`);
            
            // 1. Pedir HTML puro a través del backend (CORS Proxy)
            const proxyUrl = `${this.baseUrl}/stream-html?stream=${streamId}&provider=${provider}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Error ${response.status}: ${text}`);
            }
            
            const html = await response.text();
            
            // 2. Extraer .m3u8 en el cliente
            const streamUrl = this._extractM3u8Url(html) || this._extractBase64Url(html);
            
            if (!streamUrl) {
                throw new Error('No se pudo extraer la URL del video del contenido web original.');
            }
            
            console.log('Stream extraído exitosamente:', streamUrl);

            return {
                playbackUrl: streamUrl,
                expiresAt: Date.now() + (60 * 60 * 1000) // 1 hora estimado
            };
        } catch (error) {
            console.error('Error durante client-side scraping:', error);
            throw error;
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
                const decoded = atob(match[1]); // Usa 'atob' nativo del navegador
                if (decoded.includes('.m3u8')) {
                    return decoded;
                }
            } catch (e) {
                console.error('Error decodificando base64 en frontend:', e.message);
            }
        }
        
        return null;
    }
}
