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
        this.apiBaseUrl = APP_CONFIG.apiBaseUrl;
        this.currentStreamId = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Carga un stream HLS desde el endpoint de manifesto del backend
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
            // Paso 1: Crear elemento video
            this._buildVideoElement();

            // Paso 2: Inicializar hls.js con el endpoint de manifesto
            // El backend (/api/stream-manifest) descargará el .m3u8 con headers correctos
            // hls.js luego descargará los segmentos directamente del CDN (bypass del 403)
            this._initializeHls(streamId);

            console.log('[HLS DEBUG] Player inicializado correctamente');

        } catch (error) {
            console.error('[HLS DEBUG] Error cargando stream:', error.message);
            throw error;
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
     * Inicializa hls.js para reproducir el stream desde el endpoint de manifesto
     */
    _initializeHls(streamId) {
        // Preferir hls.js sobre HLS nativo porque permite cargar desde el proxy
        // Solo usar HLS nativo en Safari real (no en Chrome/Firefox que lo simulan)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const canPlayHls = this.video.canPlayType('application/vnd.apple.mpegurl');

        if (isSafari && canPlayHls) {
            console.log('[HLS DEBUG] Safari detectado, usando HLS nativo');
            // Para Safari, también usar el endpoint de manifesto para obtener el .m3u8
            const manifestUrl = `${this.apiBaseUrl}/stream-manifest?stream=${encodeURIComponent(streamId)}`;
            this.video.src = manifestUrl;
            
            // Listener para errores en Safari
            this.video.addEventListener('error', () => {
                const error = this.video.error;
                if (error && error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                    console.error('[HLS DEBUG] Error 403 o URL inválida (Safari), reintentando...');
                    this._retryWithNewUrl(streamId);
                }
            });
        } else {
            // Usar hls.js para Chrome, Firefox, Edge, etc.
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

            // Usar el endpoint de manifesto del backend en lugar de la URL directa
            // El backend descarga el .m3u8 con headers correctos (Referer, Origin, etc.)
            // Los segmentos de video se descargan directamente del CDN por hls.js
            const manifestUrl = `${this.apiBaseUrl}/stream-manifest?stream=${encodeURIComponent(streamId)}`;
            console.log('[HLS DEBUG] Cargando manifesto desde:', manifestUrl);
            this.hls.loadSource(manifestUrl);
        }
    }

    /**
     * Reintentar recargando el manifesto desde el backend
     * Esto obtiene un token fresco del servidor, que luego descarga el .m3u8 con headers correctos
     */
    _retryWithNewUrl(streamId) {
        if (this.retryCount >= this.maxRetries) {
            console.error('[HLS DEBUG] Se alcanzó el máximo de reintentos');
            return;
        }

        this.retryCount++;
        console.log(`[HLS DEBUG] Reintentando con manifesto nuevo (intento ${this.retryCount}/${this.maxRetries})...`);

        try {
            // Limpiar HLS anterior
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            // Reinicializar hls.js
            // Esto causará que hls.js request el manifesto nuevamente,
            // obteniendo un token fresco del backend
            this._initializeHls(streamId);

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
