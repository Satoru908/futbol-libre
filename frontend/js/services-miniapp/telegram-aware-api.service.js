/**
 * Servicio API mejorado para Telegram Mini Apps
 * Añade información del usuario de Telegram a las llamadas a la API
 */

import { TelegramConnector } from './telegram-connector.js';
import { AdBlockerUIService } from './ad-blocker-ui.service.js';

class _TelegramAwareApiService {
  constructor() {
    this.telegramUserId = null;
    this.initialized = false;
  }

  /**
   * Inicializa el servicio con información de Telegram
   */
  async initialize() {
    this.telegramUserId = TelegramConnector.getUserId();
    this.initialized = true;
    
    if (this.telegramUserId) {
      console.log(`🔗 API Service conectado a usuario de Telegram: ${this.telegramUserId}`);
      this.setupAdBlocking();
    }
  }

  /**
   * Configura bloqueo de anuncios automático en Telegram Mini App
   */
  setupAdBlocking() {
    try {
      // 1. Forzar fullscreen para maximizar el espacio y minimizar anuncios
      if (window.Telegram?.WebApp?.requestFullscreen) {
        window.Telegram.WebApp.requestFullscreen();
        console.log('📺 Fullscreen activado para miniapp');
      }

      // 2. Expandir la vista al máximo
      if (window.Telegram?.WebApp?.expand) {
        window.Telegram.WebApp.expand();
        console.log('📐 Vista expandida');
      }

      // 3. Desactivar deslizamientos verticales (evita overlays de anuncios)
      if (window.Telegram?.WebApp?.enableVerticalSwipes) {
        window.Telegram.WebApp.enableVerticalSwipes(false);
        console.log('🚫 Deslizamientos verticales desactivados');
      }

      // 4. Bloquear cargas de scripts de terceros de anuncios
      this.blockThirdPartyScripts();

      // 5. Bloquear iframes de anuncios
      this.blockAdvertisingIframes();
    } catch (error) {
      console.warn('⚠️ Error configurando bloqueo de anuncios:', error.message);
    }
  }

  /**
   * Bloquea scripts de terceros conocidos para anuncios
   */
  blockThirdPartyScripts() {
    const adScriptPatterns = [
      'google-analytics',
      'googletagmanager',
      'pagead2',
      'ads.',
      'doubleclick',
      'adroll',
      'addthis',
      'ads', 'ad-', 'ad=',
      'googleads', 'adsense',
      'criteo', 'outbrain', 'taboola',
      'googlesyndication', 'googleadservices',
      'tracking', 'analytics', 'gtag',
      'disqus', 'consent',
      'facebook.com/en_US/sdk',
      'twitter.com/widgets',
      'reddit.com/api'
    ];

    // 1. Interceptar fetch de scripts de anuncios
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string') {
        for (const pattern of adScriptPatterns) {
          if (url.toLowerCase().includes(pattern)) {
            console.log(`🚫 Bloqueado script de anuncio: ${url}`);
            AdBlockerUIService.showBlocked('script');
            return Promise.reject(new Error('Anuncio bloqueado'));
          }
        }
      }
      return originalFetch.apply(this, args);
    };

    // 2. Bloquear script tags que se inyecten en el DOM
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name.toLowerCase() === 'src') {
            for (const pattern of adScriptPatterns) {
              if (value.toLowerCase().includes(pattern)) {
                console.log(`🚫 Bloqueado <script src> de anuncio: ${value}`);
                AdBlockerUIService.showBlocked('script');
                return; // No establecer el atributo
              }
            }
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };
  }

  /**
   * Bloquea iframes de anuncios comunes
   */
  blockAdvertisingIframes() {
    // Lista completa de indicadores de anuncios
    const adIndicators = [
      'ads', 'ad-', 'ad.',
      'doubleclick', 'pagead', 'googleads', 'adsense', 'adroll', 'addthis',
      'banner', 'popup', 'modal',
      'interstitial', 'rewarded',
      'googlesyndication', 'googleadservices',
      'criteo', 'outbrain', 'taboola',
      'disqus', 'consent',
      'tracking', 'analytics'
    ];

    // Inicialmente eliminar iframes existentes de anuncios
    this.removeExistingAdFrames(adIndicators);

    // Observar cambios en el DOM para detectar nuevos iframes de anuncios
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.tagName === 'IFRAME') {
              const src = node.getAttribute('src') || '';
              const id = node.getAttribute('id') || '';
              const name = node.getAttribute('name') || '';
              const dataAttr = node.getAttribute('data-*') || '';
              
              // Detectar iframes de anuncios
              const isAdFrame = adIndicators.some(indicator => 
                src.toLowerCase().includes(indicator) || 
                id.toLowerCase().includes(indicator) ||
                name.toLowerCase().includes(indicator)
              );
              
              if (isAdFrame) {
                console.log(`🚫 Iframe de anuncio detectado y bloqueado: ${id || src}`);
                AdBlockerUIService.showBlocked('iframe');
                node.style.display = 'none';
                node.remove();
              }
              // Bloquear iframes sin src (potencial injection)
              else if (!src) {
                console.log(`🚫 Iframe sin src bloqueado (potencial anuncio): ${id || name}`);
                AdBlockerUIService.incrementCounter();
                node.style.display = 'none';
                node.remove();
              }
            }
          });
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'id', 'name']
    });
  }

  /**
   * Elimina iframes de anuncios que ya existen en la página
   */
  removeExistingAdFrames(adIndicators) {
    const allIframes = document.querySelectorAll('iframe');
    allIframes.forEach(iframe => {
      const src = iframe.getAttribute('src') || '';
      const id = iframe.getAttribute('id') || '';
      const name = iframe.getAttribute('name') || '';
      
      const isAdFrame = adIndicators.some(indicator => 
        src.toLowerCase().includes(indicator) || 
        id.toLowerCase().includes(indicator) ||
        name.toLowerCase().includes(indicator)
      );
      
      if (isAdFrame) {
        console.log(`🚫 Removiendo iframe de anuncio existente: ${id || src}`);
        AdBlockerUIService.showBlocked('iframe');
        iframe.style.display = 'none';
        iframe.remove();
      } else if (!src) {
        console.log(`🚫 Removiendo iframe sin src: ${id || name}`);
        AdBlockerUIService.incrementCounter();
        iframe.style.display = 'none';
        iframe.remove();
      }
    });
  }

  /**
   * Realiza una llamada fetch mejorada con datos de Telegram
   * @param {string} url URL a llamar
   * @param {Object} options Opciones de fetch
   * @return {Promise<Response>}
   */
  async fetch(url, options = {}) {
    // Añadir header con ID de usuario de Telegram si está disponible
    if (this.telegramUserId) {
      options.headers = options.headers || {};
      options.headers['X-Telegram-User-Id'] = this.telegramUserId;
    }

    // Timeout por defecto para evitar cuelgues en Telegram
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout en la solicitud a ${url}`);
      }
      throw error;
    }
  }

  /**
   * Obtiene datos JSON con soporte para Telegram
   * @param {string} url URL a llamar
   * @return {Promise<Object>}
   */
  async fetchJson(url) {
    const response = await this.fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} en ${url}`);
    }

    return await response.json();
  }

  /**
   * Registra una interacción del usuario en el backend
   * @param {string} action Acción realizada
   * @param {Object} metadata Metadatos adicionales
   */
  async trackInteraction(action, metadata = {}) {
    if (!this.telegramUserId) {
      return; // No trackear si no hay usuario
    }

    try {
      const apiBaseUrl = this.getApiBaseUrl();
      await this.fetch(`${apiBaseUrl}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          telegramUserId: this.telegramUserId,
          timestamp: new Date().toISOString(),
          metadata
        })
      });
    } catch (error) {
      // Silenciar errores de tracking
      console.warn('⚠️ Error al registrar interacción:', error.message);
    }
  }

  /**
   * Obtiene la URL base de la API
   */
  getApiBaseUrl() {
    // Importar dinámicamente para evitar dependencias circulares
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.apiBaseUrl) {
      return APP_CONFIG.apiBaseUrl;
    }

    // Fallback
    return window.location.hostname === 'localhost'
      ? 'http://localhost:8787/api'
      : 'https://futbol-libre-production-5102.up.railway.app/api';
  }
}

export const TelegramAwareApiService = new _TelegramAwareApiService();
