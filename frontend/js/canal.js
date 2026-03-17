import { ChannelDataService } from "./services/channel-data.service.js";
import { IframePlayerService } from "./services/iframe-player.service.js";

class CanalPage {
  constructor() {
    this.channelDataService = new ChannelDataService();
    this.iframePlayer = null;
    this.streamId = null;
    
    this.init();
  }

  async init() {
    this.streamId = new URLSearchParams(window.location.search).get("stream");

    if (!this.streamId) {
      this._showError('No se especificó un canal. <a href="index.html" style="color:#4caf50">Volver al inicio</a>');
      return;
    }

    await this.loadChannelMetadata();
    this.setupPlayer();
    this._setupEventListeners();
  }

  async loadChannelMetadata() {
    const channel = await this.channelDataService.getChannelByStream(this.streamId);
    this.currentChannel = channel;

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
    if (!container) return;

    this.iframePlayer = new IframePlayerService(container);
    this._showLoading(true);

    try {
      // Inyectar visualmente el Iframe y enmascararlo
      this.iframePlayer.load(this.streamId);
      
      // Ocultar loading cuando el iframe termine de cargar
      this.iframePlayer.iframe.onload = () => {
        this._showLoading(false);
      };
      
      // Fallback por si acaso
      setTimeout(() => this._showLoading(false), 3000);
      
    } catch (error) {
      console.error("Error loading stream:", error);
      this._showLoading(false);
      this._showPlayerError(error.message);
    }
  }

  /**
   * Programa refresh del token antes de que expire
   */
  _scheduleTokenRefresh(expiresAt) {
    const timeUntilExpiry = expiresAt - Date.now();
    if (timeUntilExpiry > 60000) {
      setTimeout(() => this._refreshToken(), timeUntilExpiry - 60000);
    }
  }

  async _refreshToken() {
    console.log("Refrescando token de stream...");
    // Implementación futura
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
    // Botón pantalla completa desktop
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this._toggleFullscreen());
    }

    // Botón pantalla completa mobile
    const fullscreenBtnMobile = document.getElementById('fullscreenBtnMobile');
    if (fullscreenBtnMobile) {
      fullscreenBtnMobile.addEventListener('click', () => this._toggleFullscreen());
    }

    // Botón volver mobile
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }

    // Botón compartir
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this._shareChannel());
    }
  }

  /**
   * Activa/desactiva pantalla completa
   */
  _toggleFullscreen() {
    const videoElement = document.getElementById('canalVideo');
    if (!videoElement) return;

    if (!document.fullscreenElement) {
      // Entrar en pantalla completa
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
      } else if (videoElement.mozRequestFullScreen) {
        videoElement.mozRequestFullScreen();
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
      }
    } else {
      // Salir de pantalla completa
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  /**
   * Comparte el canal actual
   */
  _shareChannel() {
    const url = window.location.href;
    const title = this.currentChannel ? this.currentChannel.name : 'Canal';
    const text = `Mira ${title} en vivo`;

    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(url).then(() => {
        if (window.notifications) {
          window.notifications.show('Enlace copiado al portapapeles', 'success');
        } else {
          alert('Enlace copiado al portapapeles');
        }
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CanalPage();
});
