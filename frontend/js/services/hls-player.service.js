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
     * Carga stream usando HLS.js
     */
    _loadWithHls(playbackUrl, resolve, reject) {
        if (this.hls) {
            this.hls.destroy();
        }

        const hlsConfig = this._getHlsConfig();
        this.hls = new Hls(hlsConfig);

        this._setupP2P();
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
            backBufferLength: 0,
            loader: undefined
        };
    }

    /**
     * Configura P2P Media Loader si está disponible
     */
    _setupP2P() {
        if (!window.p2pml || !window.p2pml.hlsjs) return;

        try {
            const p2pConfig = {
                loader: {
                    trackerAnnounce: [
                        'wss://tracker.openwebtorrent.com',
                        'wss://tracker.btorrent.xyz',
                        'wss://tracker.novage.com.ua',
                        'wss://tracker.files.fm:7073/announce'
                    ],
                    cachedSegmentExpiration: 86400000,
                    cachedSegmentsCount: 500,
                    requiredSegmentsPriority: 2,
                    httpDownloadProbability: 0.06,
                    httpDownloadProbabilityInterval: 1000,
                    httpDownloadProbabilitySkipIfNoPeers: true,
                    p2pDownloadMaxPriority: 50,
                    httpFailedSegmentTimeout: 500,
                    simultaneousP2PDownloads: 20,
                    simultaneousHttpDownloads: 2
                }
            };

            const engine = new window.p2pml.hlsjs.Engine(p2pConfig);
            this.hls.config.loader = engine.createLoaderClass();

            if (window.p2pml.hlsjs.initHlsJsPlayer) {
                window.p2pml.hlsjs.initHlsJsPlayer(this.hls);
            }
        } catch (e) {
            console.warn('P2P setup warning:', e);
        }
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
                console.error('Fatal network error, trying to recover');
                this.hls.startLoad();
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error, trying to recover');
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
