import { APP_CONFIG } from '../config/constants.js';
import { initAntiRedirect } from '../utils/anti-redirect.js';

export class DirectHLSPlayerService {
  constructor(containerElement) {
    this.container = containerElement;
    this.video = null;
    this.hls = null;
    this.currentPlayer = 'capo'; // Player por defecto
    this.currentChannelId = null;
    this.antiRedirectCleanup = null;
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
      
      // Guardar el ID del canal para el selector de players
      this.currentChannelId = data.channelNumber || streamId;
      
      // Verificar si es iframe o HLS
      if (data.playerType === 'iframe' && data.iframeUrl) {
        console.log('[DirectHLS] Usando reproductor iframe');
        console.log('[DirectHLS] URL del iframe:', data.iframeUrl);
        console.log('[DirectHLS] Provider:', data.provider);
        
        // Activar protección anti-redirect
        if (!this.antiRedirectCleanup) {
          this.antiRedirectCleanup = initAntiRedirect();
          console.log('[DirectHLS] ✅ Protección anti-redirect activada');
        }
        
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
    
    // Crear contenedor principal
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';
    
    // Selector de players
    const playerSelector = this._createPlayerSelector();
    
    // Banner informativo arriba del video
    const infoBanner = document.createElement('div');
    infoBanner.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      animation: slideDown 0.5s ease-out;
    `;
    infoBanner.innerHTML = `
      <span style="font-size: 20px;">🔊</span>
      <span>Haz click en <strong>"UNMUTE"</strong> o <strong>"CLICK HERE TO UNMUTE"</strong> para activar el audio</span>
    `;
    
    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    if (!document.querySelector('style[data-iframe-banner]')) {
      style.setAttribute('data-iframe-banner', 'true');
      document.head.appendChild(style);
    }
    
    // Botón para cerrar el banner
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: auto;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(255,255,255,0.3)';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
      closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.onclick = () => {
      infoBanner.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => infoBanner.remove(), 300);
    };
    
    // Agregar animación de cierre
    const closeStyle = document.createElement('style');
    closeStyle.textContent = `
      @keyframes slideUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
      }
    `;
    if (!document.querySelector('style[data-iframe-close]')) {
      closeStyle.setAttribute('data-iframe-close', 'true');
      document.head.appendChild(closeStyle);
    }
    
    infoBanner.appendChild(closeBtn);
    
    // Auto-cerrar después de 8 segundos
    setTimeout(() => {
      if (infoBanner.parentElement) {
        infoBanner.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => infoBanner.remove(), 300);
      }
    }, 8000);
    
    // Contenedor del iframe con capa protectora
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = 'position: relative; flex: 1; background: #000;';
    
    // Iframe del video
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: #000;';
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    
    // Capa transparente protectora (cubre 25% superior donde están los anuncios)
    const protectiveLayer = document.createElement('div');
    protectiveLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 25%;
      z-index: 10;
      pointer-events: auto;
      background: transparent;
    `;
    protectiveLayer.title = 'Área protegida contra anuncios';
    
    iframeContainer.appendChild(iframe);
    iframeContainer.appendChild(protectiveLayer);
    
    wrapper.appendChild(playerSelector);
    wrapper.appendChild(infoBanner);
    wrapper.appendChild(iframeContainer);
    this.container.appendChild(wrapper);
    
    console.log('[DirectHLS] Iframe con protección anti-anuncios agregado al DOM');
  }

  _createPlayerSelector() {
    const selector = document.createElement('div');
    selector.style.cssText = `
      background: rgba(59, 85, 109, 0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(95, 194, 186, 0.3);
      border-radius: 8px;
      padding: 10px 15px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    `;
    
    const label = document.createElement('span');
    label.textContent = 'Player:';
    label.style.cssText = 'color: white; font-weight: 600; font-size: 14px;';
    
    const players = [
      { id: 'capo', name: 'Capo' },
      { id: '1', name: 'Player 1' },
      { id: '2', name: 'Player 2' },
      { id: '3', name: 'Player 3' }
    ];
    
    selector.appendChild(label);
    
    players.forEach(player => {
      const btn = document.createElement('button');
      btn.textContent = player.name;
      btn.style.cssText = `
        background: ${this.currentPlayer === player.id ? '#5FC2BA' : 'rgba(95, 194, 186, 0.2)'};
        border: 1px solid ${this.currentPlayer === player.id ? '#5FC2BA' : 'rgba(95, 194, 186, 0.3)'};
        color: white;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
      `;
      
      btn.onmouseover = () => {
        if (this.currentPlayer !== player.id) {
          btn.style.background = 'rgba(95, 194, 186, 0.4)';
        }
      };
      
      btn.onmouseout = () => {
        if (this.currentPlayer !== player.id) {
          btn.style.background = 'rgba(95, 194, 186, 0.2)';
        }
      };
      
      btn.onclick = () => {
        if (this.currentPlayer !== player.id) {
          this.currentPlayer = player.id;
          this._switchPlayer(player.id);
        }
      };
      
      selector.appendChild(btn);
    });
    
    return selector;
  }

  _switchPlayer(playerId) {
    console.log(`[DirectHLS] Cambiando a player: ${playerId}`);
    
    if (!this.currentChannelId) {
      console.error('[DirectHLS] No hay canal cargado');
      return;
    }
    
    // Limpiar contenedor
    this.destroy();
    
    // Crear nueva URL con el player seleccionado
    const newUrl = `https://bolaloca.my/player/${playerId}/${this.currentChannelId}`;
    console.log('[DirectHLS] Nueva URL:', newUrl);
    
    // Recargar con el nuevo player
    this._createIframePlayer(newUrl);
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
    if (this.antiRedirectCleanup) {
      this.antiRedirectCleanup();
      this.antiRedirectCleanup = null;
    }
    // Limpiar todo el contenedor
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
