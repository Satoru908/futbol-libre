import { APP_CONFIG } from '../config/constants.js';

/**
 * HLS Direct Player Service
 * 
 * Reproductor HLS directo usando hls.js
 * 
 * En lugar de usar un iframe con HTML sanitizado (que tiene tokens expirados),
 * este servicio obtiene la URL del stream FRESCA desde el backend y la reproduce
 * directamente usando hls.js.
 * 
 * Ventajas:
 * - Token siempre fresco (obtenido al hacer load())
 * - Control total del reproductor
 * - Sin iframes, sin problemas de Same-Origin Policy
 * - Pueden personalizarse los controles
 */
export class HlsDirectPlayerService {
    constructor(containerElement) {
        this.container = containerElement;
        this.video = null;
        this.hls = null;
        this.controls = null;
        this.apiBaseUrl = APP_CONFIG.apiBaseUrl;
    }

    /**
     * Carga un stream HLS usando URL fresca desde el backend
     * @param {string} streamId - ID del stream a cargar
     */
    async load(streamId) {
        if (!streamId) {
            throw new Error('streamId es requerido');
        }

        console.log('[HLS DEBUG] Cargando stream:', streamId);
        console.log('[HLS DEBUG] API Base URL:', this.apiBaseUrl);

        try {
            // Paso 1: Obtener URL del stream desde el backend
            const streamUrl = await this._fetchStreamUrl(streamId);
            
            if (!streamUrl) {
                throw new Error('No se pudo obtener la URL del stream');
            }

            console.log('[HLS DEBUG] Stream URL obtenida:', streamUrl);

            // Paso 2: Crear elemento video
            this._buildVideoElement();

            // Paso 3: Inicializar hls.js
            this._initializeHls(streamUrl);

            console.log('[HLS DEBUG] Player inicializado correctamente');

        } catch (error) {
            console.error('[HLS DEBUG] Error cargando stream:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene la URL del stream desde el backend
     */
    async _fetchStreamUrl(streamId) {
        try {
            const url = `${this.apiBaseUrl}/stream-url?stream=${encodeURIComponent(streamId)}`;
            console.log('[HLS DEBUG] Fechando stream URL desde:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[HLS DEBUG] Stream URL response:', data);

            return data.url || null;

        } catch (error) {
            console.error('[HLS DEBUG] Error fetching stream URL:', error.message);
            return null;
        }
    }

    /**
     * Construye el elemento video con controles
     */
    _buildVideoElement() {
        // Limpiar contenedor
        this.container.innerHTML = '';

        // Crear elemento video
        this.video = document.createElement('video');
        this.video.id = 'hls-video-player';
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.background = '#000';
        this.video.controls = true;
        this.video.autoplay = false;

        // Crear wrapper con posición relativa para controles personalizados
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.appendChild(this.video);

        this.container.appendChild(wrapper);

        console.log('[HLS DEBUG] Elemento video creado');
    }

    /**
     * Inicializa hls.js para reproducir el stream
     */
    _initializeHls(streamUrl) {
        // Si el navegador soporta HLS nativo (como Safari)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('[HLS DEBUG] Usando HLS nativo del navegador');
            this.video.src = streamUrl;
        } else {
            // Usar hls.js para otros navegadores
            if (typeof Hls === 'undefined') {
                console.error('[HLS DEBUG] hls.js no está cargado');
                throw new Error('hls.js library is required but not loaded');
            }

            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true
            });

            this.hls.attachMedia(this.video);

            // Event listeners
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('[HLS DEBUG] Manifest cargado, iniciando reproducción');
                // Auto-play opcional
                // this.video.play();
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('[HLS DEBUG] Error fatal en HLS:', data);
                    this._handleHlsError(data);
                } else {
                    console.warn('[HLS DEBUG] Error HLS (recuperable):', data);
                }
            });

            // Cargar stream
            this.hls.loadSource(streamUrl);
        }
    }

    /**
     * Maneja errores de HLS
     */
    _handleHlsError(data) {
        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[HLS DEBUG] Error de red:', data);
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[HLS DEBUG] Error de media:', data);
                this.hls.recoverMediaError();
                break;
            default:
                console.error('[HLS DEBUG] Error desconocido:', data);
        }
    }

    /**
     * Limpia recursos
     */
    destroy() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        if (this.video) {
            this.video.src = '';
            this.video.pause();
            this.video = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        console.log('[HLS DEBUG] Player destruido');
    }
}
