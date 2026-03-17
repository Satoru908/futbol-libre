export class StreamApiService {
    constructor(baseUrl = 'http://localhost:8787/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Obtiene la URL de reproducción para un canal
     */
    async getResolvedStream(streamId) {
        try {
            const url = `${this.baseUrl}/stream-url?stream=${streamId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Error ${response.status}: ${text}`);
            }
            
            const data = await response.json();
            
            // Si la URL es relativa, construir URL completa
            if (data.playbackUrl && data.playbackUrl.startsWith('/')) {
                const urlObj = new URL(this.baseUrl);
                data.playbackUrl = `${urlObj.origin}${data.playbackUrl}`;
            }

            return data;
        } catch (error) {
            console.error('Stream API Error:', error);
            throw error;
        }
    }
}
