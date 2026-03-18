import { APP_CONFIG } from '../config/constants.js';

export class DirectHLSPlayerService {
  constructor(containerElement) {
    this.container = containerElement;
    this.video = null;
    this.hls = null;
  }

  async load(streamId) {
    try {
      await this._ensureHlsLoaded();

      const response = await fetch(`${APP_CONFIG.apiBaseUrl}/api/m3u8-direct?stream=${encodeURIComponent(streamId)}`);
      
      if (!response.ok) {
        throw new Error(`Error API: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.m3u8Url) {
        throw new Error('No se obtuvo URL M3U8');
      }

      this._createVideoPlayer(data.m3u8Url);

    } catch (error) {
      console.error('[DirectHLS] Error:', error);
      throw error;
    }
  }

  async _ensureHlsLoaded() {
    if (window.Hls) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar HLS.js'));
      document.head.appendChild(script);
    });
  }

  _createVideoPlayer(m3u8Url) {
    this.video = document.createElement('video');
    this.video.controls = true;
    this.video.autoplay = true;
    this.video.style.cssText = 'width: 100%; height: 100%; background: #000;';

    if (window.Hls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      this.hls.loadSource(m3u8Url);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.video.play().catch(e => console.warn('Autoplay bloqueado:', e));
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('[DirectHLS] Error fatal:', data);
        }
      });

    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = m3u8Url;
    }

    this.container.appendChild(this.video);
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
