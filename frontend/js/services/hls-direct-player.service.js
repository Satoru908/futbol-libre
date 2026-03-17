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
        this.currentStreamId = null;
        this.currentHeaders = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Carga un stream HLS usando URL fresca desde el backend
     * @param {string} streamId - ID del stream a cargar
     */
    async load(streamId) {
        if (!streamId) {
            throw new Error('streamId es requerido');
        }

        this.currentStreamId = streamId;
        this.retryCount = 0;

        console.log('[HLS DEBUG] Cargando stream:', streamId);
        console.log('[HLS DEBUG] API Base URL:', this.apiBaseUrl);

        try {
            // Paso 1: Obtener URL del stream desde el backend (con reintentos)
            const streamData = await this._fetchStreamUrlWithRetry(streamId);
            
            if (!streamData || !streamData.url) {
                throw new Error('No se pudo obtener la URL del stream');
            }

            const streamUrl = streamData.url;
            console.log('[HLS DEBUG] Stream URL obtenida:', streamUrl);

            // Paso 2: Crear elemento video
            this._buildVideoElement();

            // Paso 3: Inicializar hls.js
            this._initializeHls(streamUrl, streamId);

            console.log('[HLS DEBUG] Player inicializado correctamente');

        } catch (error) {
            console.error('[HLS DEBUG] Error cargando stream:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene la URL del stream con reintentos automáticos
     */
    async _fetchStreamUrlWithRetry(streamId, attempt = 1) {
        try {
            const streamData = await this._fetchStreamUrl(streamId);
            if (streamData) {
                console.log(`[HLS DEBUG] URL obtenida en intento ${attempt}`);
                return streamData;
            }
            
            // Si no hay URL pero tampoco error, reintentar
            if (attempt < this.maxRetries) {
                console.log(`[HLS DEBUG] Reintentando obtener URL (intento ${attempt + 1}/${this.maxRetries})...`);
                await this._delay(1000 * attempt); // Espera exponencial
                return this._fetchStreamUrlWithRetry(streamId, attempt + 1);
            }
            
            return null;
        } catch (error) {
            if (attempt < this.maxRetries) {
                console.log(`[HLS DEBUG] Error en intento ${attempt}, reintentando...`);
                await this._delay(1000 * attempt);
                return this._fetchStreamUrlWithRetry(streamId, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene la URL y headers del stream desde el backend
     * @returns {Promise<{url: string, headers: object}>} - Objeto con URL y headers
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

            // Guardar headers para usarlos luego en hls.js
            if (data.headers) {
                this.currentHeaders = data.headers;
                console.log('[HLS DEBUG] Headers recibidos:', this.currentHeaders);
            }

            return {
                url: data.url,
                headers: data.headers || {}
            } || null;

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
    _initializeHls(streamUrl, streamId) {
        // Si el navegador soporta HLS nativo (como Safari)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('[HLS DEBUG] Usando HLS nativo del navegador');
            this.video.src = streamUrl;
            
            // Listener para errores de network en navegador nativo
            this.video.addEventListener('error', () => {
                const error = this.video.error;
                if (error && error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                    console.error('[HLS DEBUG] Error 403 o URL inválida, reintentando...');
                    this._retryWithNewUrl(streamId);
                }
            });
        } else {
            // Usar hls.js para otros navegadores
            if (typeof Hls === 'undefined') {
                console.error('[HLS DEBUG] hls.js no está cargado');
                throw new Error('hls.js library is required but not loaded');
            }

            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                // Configurar headers personalizados para descargas
                xhrSetup: (xhr, url) => {
                    // Agregar headers necesarios para acceder a FuboHD
                    if (this.currentHeaders) {
                        if (this.currentHeaders['Referer']) {
                            xhr.setRequestHeader('Referer', this.currentHeaders['Referer']);
                        }
                        // User-Agent se configura a nivel del navegador, no en XHR
                    }
                }
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
                    // Si es error de red (potencialmente 403), reintentar con URL nueva
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        console.error('[HLS DEBUG] Error de red (posible 403):', data);
                        this._retryWithNewUrl(streamId);
                    } else {
                        console.error('[HLS DEBUG] Error fatal en HLS:', data);
                        this._handleHlsError(data);
                    }
                } else {
                    console.warn('[HLS DEBUG] Error HLS (recuperable):', data);
                }
            });

            // Cargar stream
            this.hls.loadSource(streamUrl);
        }
    }

    /**
     * Reintentar con una URL nueva del backend
     */
    async _retryWithNewUrl(streamId) {
        if (this.retryCount >= this.maxRetries) {
            console.error('[HLS DEBUG] Se alcanzó el máximo de reintentos');
            return;
        }

        this.retryCount++;
        console.log(`[HLS DEBUG] Reintentando con URL nueva (intento ${this.retryCount}/${this.maxRetries})...`);

        try {
            // Obtener URL nueva
            const streamData = await this._fetchStreamUrl(streamId);
            
            if (!streamData || !streamData.url) {
                throw new Error('No se pudo obtener URL nueva');
            }

            const newStreamUrl = streamData.url;
            console.log('[HLS DEBUG] URL nueva obtenida, cargando...');

            // Limpiar HLS anterior
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            // Reinicializar con la nueva URL
            this._initializeHls(newStreamUrl, streamId);

        } catch (error) {
            console.error('[HLS DEBUG] Error reintentando:', error.message);
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
