import { ChannelDataService } from "./services/channel-data.service.js";
import { APP_CONFIG } from "./config/constants.js";

class CanalPage {
  constructor() {
    this.channelDataService = new ChannelDataService();
    this.iframe = null;
    this.streamId = null;
    
    this.init();
  }

  async init() {
    this.streamId = new URLSearchParams(window.location.search).get("stream");

    if (!this.streamId) {
      this._showError('No se especificó un canal. <a href="index.html" style="color:#4caf50">Volver al inicio</a>');
      return;
    }

    console.log('[CANAL] Stream ID:', this.streamId);
    console.log('[CANAL] API Base URL:', APP_CONFIG.apiBaseUrl);
    
    await this.loadChannelMetadata();
    this.setupPlayer();
    this._setupEventListeners();
  }

  async loadChannelMetadata() {
    console.log('[CANAL] Cargando metadatos del canal...');
    const channel = await this.channelDataService.getChannelByStream(this.streamId);
    this.currentChannel = channel;

    console.log('[CANAL] Canal encontrado:', channel);

    if (channel) {
      this._updateChannelUI(channel);
    }
  }

  /**
   * Actualiza la UI con información del canal
   */
  _updateChannelUI(channel) {
    const logoInitials = this._getInitials(channel.name);

    // Mobile
    this._updateElement('canalNameMobile', channel.name);
    this._setupLogo('canalLogoMobile', channel.logo, logoInitials, channel.name);

    // Desktop
    this._updateElement('canalName', channel.name);
    this._setupLogo('canalLogo', channel.logo, logoInitials, channel.name);

    // Title
    this._updateElement('pageTitle', `${channel.name} - Fútbol Libre Vivo`);

    // Description
    this._updateElement('canalDescription', `Ver ${channel.name} en vivo por internet`);

    // Dynamic names
    document.querySelectorAll('.dynamic-channel-name').forEach(el => {
      el.textContent = channel.name;
    });
  }

  /**
   * Configura logo con fallback a placeholder
   */
  _setupLogo(imgId, logoUrl, initials, altText) {
    const img = document.getElementById(imgId);
    if (!img) return;

    const parent = img.parentElement;
    const oldPlaceholder = parent.querySelector('.logo-placeholder');
    if (oldPlaceholder) oldPlaceholder.remove();

    const placeholder = document.createElement('div');
    placeholder.className = 'logo-placeholder';
    placeholder.textContent = initials;
    placeholder.style.display = 'none';
    parent.appendChild(placeholder);

    if (logoUrl && logoUrl.startsWith('http')) {
      img.src = logoUrl;
      img.alt = altText;
      img.style.display = 'block';
      img.onerror = () => {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
      };
    } else {
      img.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  }

  async setupPlayer() {
    if (this.currentChannel && this.currentChannel.is_active === false) {
      this._showOfflineMessage();
      return;
    }

    const container = document.querySelector('.player-container');
    if (!container) {
      console.error('[CANAL] No se encontró .player-container en el DOM');
      return;
    }

    console.log('[CANAL] Configurando player con iframe directo...');
    this._showLoading(true);

    try {
      // Obtener URL directa del provider desde el backend
      const response = await fetch(`${APP_CONFIG.apiBaseUrl}/stream-provider-url?stream=${encodeURIComponent(this.streamId)}`);
      
      if (!response.ok) {
        throw new Error(`Error API: ${response.status}`);
      }

      const data = await response.json();
      const streamUrl = data.url;

      console.log('[CANAL] URL del stream obtenida:', streamUrl);

      // Crear y cargar iframe con la URL directa
      this._createIframe(container, streamUrl);
      
      this._showLoading(false);
      console.log('[CANAL] Player cargado exitosamente');
      
    } catch (error) {
      console.error("[CANAL] Error loading stream:", error);
      this._showLoading(false);
      this._showPlayerError(error.message);
    }
  }

  /**
   * Crea un iframe con la URL del stream
   */
  _createIframe(container, streamUrl) {
    // Limpiar contenedor
    container.innerHTML = '';

    // Crear máscara oscura de fondo
    const mask = document.createElement('div');
    mask.className = 'iframe-mask';
    mask.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #000;
      overflow: hidden;
    `;

    // Crear iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = streamUrl;
    this.iframe.setAttribute('allowfullscreen', 'true');
    this.iframe.setAttribute('scrolling', 'no');
    this.iframe.className = 'stream-iframe';
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    // Crear controles personalizados
    const controls = document.createElement('div');
    controls.className = 'custom-player-controls';
    controls.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.5));
      z-index: 100;
    `;

    // Botón fullscreen
    const fsBtn = document.createElement('button');
    fsBtn.className = 'control-btn';
    fsBtn.id = 'customFullscreenBtn';
    fsBtn.title = 'Pantalla completa';
    fsBtn.innerHTML = '<span style="font-size: 18px;">⛶</span>';
    fsBtn.style.cssText = `
      background: rgba(255,255,255,0.3);
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    fsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._toggleFullscreen(container);
    });

    controls.appendChild(fsBtn);
    
    // Ensamblar
    mask.appendChild(this.iframe);
    mask.appendChild(controls);
    container.appendChild(mask);

    console.log('[CANAL] Iframe inyectado en DOM');
  }

  /**
   * Activa/desactiva pantalla completa
   */
  _toggleFullscreen(element) {
    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  _showOfflineMessage() {
    const container = document.querySelector('.player-container');
    if (container) {
      container.innerHTML = `
        <div class="player-offline">
          <div class="offline-icon">😴</div>
          <h3>Canal Fuera de Línea</h3>
          <p>Este canal no está transmitiendo en este momento.</p>
          <a href="index.html" class="btn-back">Ver otros canales</a>
        </div>
      `;
    }
  }

  _showPlayerError(message) {
    const container = document.querySelector('.player-container');
    if (container) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'player-error';
      errorMsg.innerHTML = `
        <p>Error cargando el canal</p>
        <small>${message}</small>
        <button onclick="window.location.reload()">Reintentar</button>
      `;
      errorMsg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(0,0,0,0.8);color:white;z-index:20;';
      container.appendChild(errorMsg);
    }
  }

  _showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
  }

  _showError(message) {
    const container = document.querySelector('.player-container');
    if (container) {
      container.innerHTML = `<div style="color:white;text-align:center;padding:20px;">${message}</div>`;
    }
  }

  _updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
  }

  _getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').substring(0, 2);
  }

  /**
   * Configura event listeners para botones
   */
  _setupEventListeners() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }
}

// Instanciar cuando DOM cargue
document.addEventListener('DOMContentLoaded', () => {
  new CanalPage();
});
