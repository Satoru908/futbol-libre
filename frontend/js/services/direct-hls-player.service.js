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
    
    // Crear contenedor para iframe + overlays
    const iframeWrapper = document.createElement('div');
    iframeWrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';
    
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: #000;';
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    // NO usar sandbox - bolaloca.my lo detecta y bloquea
    
    // Crear 4 divs que cubran todo EXCEPTO la zona del botón unmute (centro-superior)
    // El botón de unmute suele estar en el centro-superior del video
    
    // Div superior (cubre desde arriba hasta antes del botón)
    const topOverlay = document.createElement('div');
    topOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 8%;
      background: transparent;
      z-index: 10;
      pointer-events: auto;
      cursor: not-allowed;
    `;
    
    // Div izquierdo (cubre el lado izquierdo a la altura del botón)
    const leftOverlay = document.createElement('div');
    leftOverlay.style.cssText = `
      position: absolute;
      top: 8%;
      left: 0;
      width: 30%;
      height: 15%;
      background: transparent;
      z-index: 10;
      pointer-events: auto;
      cursor: not-allowed;
    `;
    
    // Div derecho (cubre el lado derecho a la altura del botón)
    const rightOverlay = document.createElement('div');
    rightOverlay.style.cssText = `
      position: absolute;
      top: 8%;
      right: 0;
      width: 30%;
      height: 15%;
      background: transparent;
      z-index: 10;
      pointer-events: auto;
      cursor: not-allowed;
    `;
    
    // Div inferior (cubre desde después del botón hasta abajo)
    const bottomOverlay = document.createElement('div');
    bottomOverlay.style.cssText = `
      position: absolute;
      top: 23%;
      left: 0;
      width: 100%;
      height: 77%;
      background: transparent;
      z-index: 10;
      pointer-events: auto;
      cursor: not-allowed;
    `;
    
    // Zona del botón unmute (centro-superior) - SIN overlay, permite clicks
    // Esta zona queda libre entre los 4 divs
    const unmuteIndicator = document.createElement('div');
    unmuteIndicator.style.cssText = `
      position: absolute;
      top: 8%;
      left: 30%;
      width: 40%;
      height: 15%;
      border: 2px dashed rgba(76, 175, 80, 0.8);
      border-radius: 8px;
      z-index: 9;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(76, 175, 80, 0.1);
      animation: pulse 2s infinite;
    `;
    
    const unmuteText = document.createElement('div');
    unmuteText.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: #4CAF50;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      pointer-events: none;
    `;
    unmuteText.textContent = '👆 CLICK AQUÍ PARA AUDIO';
    unmuteIndicator.appendChild(unmuteText);
    
    // Agregar animación de pulso
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { 
          border-color: rgba(76, 175, 80, 0.8);
          background: rgba(76, 175, 80, 0.1);
        }
        50% { 
          border-color: rgba(76, 175, 80, 1);
          background: rgba(76, 175, 80, 0.2);
        }
      }
    `;
    document.head.appendChild(style);
    
    // Remover overlays después de 5 segundos (asumiendo que el usuario ya hizo click)
    setTimeout(() => {
      [topOverlay, leftOverlay, rightOverlay, bottomOverlay, unmuteIndicator].forEach(el => {
        if (el.parentElement) el.remove();
      });
      console.log('[DirectHLS] Overlays de protección removidos');
    }, 5000);
    
    // Agregar elementos al DOM
    iframeWrapper.appendChild(iframe);
    iframeWrapper.appendChild(topOverlay);
    iframeWrapper.appendChild(leftOverlay);
    iframeWrapper.appendChild(rightOverlay);
    iframeWrapper.appendChild(bottomOverlay);
    iframeWrapper.appendChild(unmuteIndicator);
    
    this.container.appendChild(iframeWrapper);
    console.log('[DirectHLS] Iframe con overlays de protección agregado al DOM');
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
    // Limpiar todo el contenedor
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
