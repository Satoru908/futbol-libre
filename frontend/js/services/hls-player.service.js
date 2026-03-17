export class HlsPlayerService {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
    }

    isSupported() {
        return Hls.isSupported();
    }

    load(playbackUrl) {
        return new Promise((resolve, reject) => {
            if (Hls.isSupported()) {
                this._loadWithHls(playbackUrl, resolve, reject);
            } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
                this._loadNative(playbackUrl, resolve, reject);
            } else {
                reject(new Error('HLS not supported'));
            }
        });
    }

    /**
     * Carga stream usando HLS.js con P2P Media Loader
     */
    _loadWithHls(playbackUrl, resolve, reject) {
        if (this.hls) {
            this.hls.destroy();
        }

        const hlsConfig = this._getHlsConfig();
        
        // Usar P2P Media Loader si está disponible
        if (typeof p2pml !== 'undefined' && p2pml.hlsjs.Engine.isSupported()) {
            const engine = new p2pml.hlsjs.Engine();
            this.hls = new Hls({
                ...hlsConfig,
                liveSyncDurationCount: 7,
                loader: engine.createLoaderClass()
            });
            p2pml.hlsjs.initHlsJsPlayer(this.hls);
        } else {
            this.hls = new Hls(hlsConfig);
        }
        
        this._attachHlsEvents(resolve, reject);
        this.hls.loadSource(playbackUrl);
        this.hls.attachMedia(this.video);
    }

    /**
     * Carga stream de forma nativa (Safari)
     */
    _loadNative(playbackUrl, resolve, reject) {
        this.video.src = playbackUrl;
        this.video.addEventListener('loadedmetadata', () => {
            this.video.play().catch(e => console.warn('Autoplay prevented', e));
            resolve();
        });
        this.video.addEventListener('error', (e) => reject(e));
    }

    /**
     * Configuración de HLS.js
     */
    _getHlsConfig() {
        return {
            debug: false,
            enableWorker: true,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            liveDurationInfinity: true,
            backBufferLength: 0
        };
    }

    /**
     * Configura event listeners de HLS.js
     */
    _attachHlsEvents(resolve, reject) {
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.video.play()
                .then(() => resolve())
                .catch(e => {
                    console.warn('Autoplay prevented:', e);
                    resolve();
                });
        });

        this.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                this._handleFatalError(data, reject);
            }
        });
    }

    /**
     * Maneja errores fatales de HLS
     */
    _handleFatalError(data, reject) {
        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error, trying to recover');
                this.hls.startLoad();
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error, trying to recover');
                this.hls.recoverMediaError();
                break;
            default:
                console.error('Fatal error, cannot recover');
                this.hls.destroy();
                reject(data);
                break;
        }
    }

    destroy() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
}
