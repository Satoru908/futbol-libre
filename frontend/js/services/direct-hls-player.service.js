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

      const apiUrl = `${APP_CONFIG.apiBaseUrl}/api/stream-url?stream=${encodeURIComponent(streamId)}`;
      console.log('[DirectHLS] Solicitando stream desde:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Error API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[DirectHLS] Respuesta del API:', data);
      
      // Verificar si es iframe o HLS
      if (data.playerType === 'iframe' && data.iframeUrl) {
        console.log('[DirectHLS] Usando reproductor iframe');
        console.log('[DirectHLS] URL del iframe:', data.iframeUrl);
        console.log('[DirectHLS] Provider:', data.provider);
        this._createIframePlayer(data.iframeUrl);
      } else if (data.m3u8Url) {
        console.log('[DirectHLS] Usando reproductor HLS');
        console.log('[DirectHLS] URL del M3U8:', data.m3u8Url);
        console.log('[DirectHLS] Provider:', data.provider);
        await this._ensureHlsLoaded();
        this._createVideoPlayer(data.m3u8Url);
      } else {
        throw new Error('No se obtuvo URL de stream (ni iframe ni M3U8)');
      }

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

  _createIframePlayer(iframeUrl) {
    console.log('[DirectHLS] Creando reproductor iframe...');
    
    // Crear contenedor para iframe + overlay
    const iframeWrapper = document.createElement('div');
    iframeWrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
    
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: #000;';
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    // NO usar sandbox - bolaloca.my lo detecta y bloquea
    
    // Crear overlay transparente que cubra todo el iframe
    const overlay = document.createElement('div');
    overlay.id = 'iframe-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      pointer-events: auto;
      background: transparent;
    `;
    
    // Crear zona clickeable para el botón de unmute (centro-superior del video)
    const unmuteZone = document.createElement('div');
    unmuteZone.id = 'unmute-zone';
    unmuteZone.style.cssText = `
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      height: 80px;
      z-index: 11;
      pointer-events: none;
      cursor: pointer;
      border: 2px dashed rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      transition: all 0.3s ease;
    `;
    unmuteZone.innerHTML = '👆 Click aquí para activar audio';
    
    // Hacer que solo la zona de unmute sea clickeable
    unmuteZone.addEventListener('mouseenter', () => {
      unmuteZone.style.background = 'rgba(0, 0, 0, 0.7)';
      unmuteZone.style.borderColor = 'rgba(255, 255, 255, 0.6)';
    });
    
    unmuteZone.addEventListener('mouseleave', () => {
      unmuteZone.style.background = 'rgba(0, 0, 0, 0.5)';
      unmuteZone.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
    
    // Cuando se hace click en la zona de unmute, permitir que el click pase al iframe
    unmuteZone.addEventListener('click', () => {
      console.log('[DirectHLS] Click en zona de unmute, permitiendo interacción con iframe');
      // Remover el overlay después de 2 segundos para permitir interacción completa
      setTimeout(() => {
        overlay.style.display = 'none';
        unmuteZone.style.display = 'none';
        console.log('[DirectHLS] Overlay removido, iframe completamente interactivo');
      }, 2000);
    });
    
    // Agregar elementos al DOM
    iframeWrapper.appendChild(iframe);
    iframeWrapper.appendChild(overlay);
    iframeWrapper.appendChild(unmuteZone);
    
    this.container.appendChild(iframeWrapper);
    console.log('[DirectHLS] Iframe con overlay agregado al DOM');
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
    // Limpiar iframes y wrappers
    const iframes = this.container.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.remove());
    
    const wrappers = this.container.querySelectorAll('div[style*="position: relative"]');
    wrappers.forEach(wrapper => wrapper.remove());
    
    // Limpiar overlays
    const overlays = this.container.querySelectorAll('#iframe-overlay, #unmute-zone');
    overlays.forEach(overlay => overlay.remove());
  }
}
