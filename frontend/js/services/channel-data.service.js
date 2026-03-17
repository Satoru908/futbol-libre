import { APP_CONFIG } from '../config/constants.js';

export class ChannelDataService {
    constructor() {
        // Use API endpoint instead of local file
        this.channelsUrl = APP_CONFIG.channelsDataUrl;
        this.cache = null;
    }

    async getChannels() {
        if (this.cache) return this.cache;
        try {
            const response = await fetch(this.channelsUrl);
            const data = await response.json();
            // Handle both formats: { channels: [...] } or direct array
            this.cache = data.channels || data || [];
            return this.cache;
        } catch (error) {
            console.error('Error fetching channels:', error);
            return [];
        }
    }

    async getChannelByStream(streamId) {
        const channels = await this.getChannels();
        let channel = channels.find(c => c.id === streamId) || 
                     channels.find(c => c.url && c.url.includes(`stream=${streamId}`));
        
        // Si no se encuentra el canal, crear uno genérico
        if (!channel) {
            channel = this._createGenericChannel(streamId);
        }
        
        return channel;
    }

    /**
     * Crea un canal genérico cuando no existe en la base de datos
     */
    _createGenericChannel(streamId) {
        return {
            id: streamId,
            name: this._formatChannelName(streamId),
            logo: null,
            category: 'OTROS',
            is_active: true
        };
    }

    /**
     * Formatea el nombre del canal desde el ID
     */
    _formatChannelName(streamId) {
        // Mapeo de nombres conocidos
        const nameMap = {
            'disney2': 'Disney+ 2',
            'disney3': 'Disney+ 3',
            'disney4': 'Disney+ 4',
            'disney5': 'Disney+ 5',
            'disney6': 'Disney+ 6',
            'disney7': 'Disney+ 7',
            'disney8': 'Disney+ 8',
            'disney9': 'Disney+ 9',
            'hypermotion1': 'Hypermotion 1',
            'espndeportes': 'ESPN Deportes',
            'sky_sports_laliga': 'Sky Sports LaLiga',
            'foxdeportes': 'Fox Deportes',
            'usanetwork': 'USA Network',
            'tntsportschile': 'TNT Sports Chile',
            'espnpremium': 'ESPN Premium'
        };

        if (nameMap[streamId]) {
            return nameMap[streamId];
        }

        // Formateo genérico: convertir guiones/underscores en espacios y capitalizar
        return streamId
            .replace(/[_-]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
