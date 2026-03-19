import { APP_CONFIG } from '../config/constants.js';

export class DirectHLSPlayerService {
  constructor(containerElement) {
    this.container = containerElement;
    this.video = null;
    this.hls = null;
  }

  async load(streamId) {
    try {
      console.log('[DirectHLS] Iniciando carga del stream:', streamId);
      await this._ensureHlsLoaded();

      const apiUrl = `${APP_CONFIG.apiBaseUrl}/api/m3u8-direct?stream=${encodeURIComponent(streamId)}`;
      console.log('[DirectHLS] Solicitando M3U8 desde:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Error API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[DirectHLS] Respuesta del API:', data);
      
      if (!data.m3u8Url) {
        throw new Error('No se obtuvo URL M3U8');
      }

      console.log('[DirectHLS] URL del M3U8:', data.m3u8Url);
      this._createVideoPlayer(data.m3u8Url);

    } catch (error) {
      console.error('[DirectHLS] Error:', error);
      throw error;
    }
  }

  async _ensureHlsLoaded() {
    if (window.Hls) {
      console.log('[DirectHLS] HLS.js ya está cargado, versión:', Hls.version);
      return;
    }

    console.log('[DirectHLS] Cargando HLS.js...');
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js';
      script.onload = () => {
        console.log('[DirectHLS] HLS.js cargado exitosamente');
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar HLS.js'));
      document.head.appendChild(script);
    });
  }

  _createVideoPlayer(m3u8Url) {
    console.log('[DirectHLS] Creando reproductor de video...');
    
    this.video = document.createElement('video');
    this.video.controls = true;
    this.video.autoplay = true;
    this.video.style.cssText = 'width: 100%; height: 100%; background: #000;';

    if (window.Hls && Hls.isSupported()) {
      console.log('[DirectHLS] HLS.js es soportado, inicializando...');
      
      this.hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        debug: true, // Activar debug para ver más información
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        // Configuración adicional para mejorar la recuperación de errores
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000
      });

      this.hls.loadSource(m3u8Url);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[DirectHLS] ✅ Manifest cargado y parseado correctamente');
        this.video.play().catch(e => console.warn('[DirectHLS] Autoplay bloqueado:', e));
      });

      this.hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('[DirectHLS] Level cargado:', data.details);
      });

      this.hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        console.log('[DirectHLS] Cargando fragmento:', data.frag.url);
      });

      this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const size = data.frag.stats?.total || 0;
        console.log(`[DirectHLS] ✅ Fragmento cargado: ${data.frag.url} (${size} bytes)`);
        
        // Validar que el fragmento tenga datos
        if (size === 0) {
          console.error('[DirectHLS] ⚠️ Fragmento vacío recibido');
        }
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[DirectHLS] Error:', data.type, data.details, data);
        
        // Log adicional para errores de parsing
        if (data.details === 'fragParsingError') {
          console.error('[DirectHLS] ❌ Error de parsing de fragmento:', {
            url: data.frag?.url,
            reason: data.reason,
            error: data.error?.message,
            bytes: data.frag?.stats?.total
          });
        }
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[DirectHLS] Error de red fatal, intentando recuperar...');
              this.hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[DirectHLS] Error de media fatal, intentando recuperar...');
              this.hls.recoverMediaError();
              break;
            default:
              console.error('[DirectHLS] Error fatal irrecuperable');
              this.hls.destroy();
              break;
          }
        }
      });

    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[DirectHLS] Usando soporte nativo de HLS');
      this.video.src = m3u8Url;
      this.video.play().catch(e => console.warn('[DirectHLS] Autoplay bloqueado:', e));
    } else {
      console.error('[DirectHLS] HLS no es soportado en este navegador');
    }

    this.container.appendChild(this.video);
    console.log('[DirectHLS] Video agregado al DOM');
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
  }
}
