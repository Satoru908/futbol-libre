/**
 * Gestor de navegación para Telegram Mini Apps
 * Evita redirecciones problemáticas dentro de Telegram
 * Mantiene compatibilidad con navegación web tradicional
 */

import { TelegramConnector } from './telegram-connector.js';

class _NavigationManager {
  constructor() {
    this.navigationStack = [];
    this.currentLocation = {};
    this.isInTelegram = false;
  }

  /**
   * Inicializa el gestor de navegación
   */
  async initialize() {
    this.isInTelegram = await TelegramConnector.initialize();
    this.currentLocation = this.parseCurrentLocation();
    
    if (this.isInTelegram) {
      this.setupTelegramNavigation();
    }

    return this.isInTelegram;
  }

  /**
   * Configura la navegación específica para Telegram
   */
  setupTelegramNavigation() {
    // SOLO en Telegram - interceptar clics en enlaces
    if (!this.isInTelegram) {
      return;  // No hacer nada en web tradicional
    }

    // Interceptar clics en enlaces
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      
      // Ignorar enlaces externos, en blanco y anclas
      if (href.startsWith('http') || link.target === '_blank' || href.startsWith('#')) {
        return;
      }

      // Interceptar navegación interna
      e.preventDefault();
      this.navigate(href);
    });

    // Manejar el botón back de Telegram
    TelegramConnector.onBackButtonClick(() => {
      if (!this.goBack()) {
        // Si no hay historial, cerrar la mini app
        window.Telegram.WebApp.close();
      }
    });

    // Mostrar botón back si hay navegación
    if (this.isPageWithBack()) {
      TelegramConnector.showBackButton();
    }
  }

  /**
   * Navega a una nueva ubicación
   * @param {string} path Ruta a navegar
   */
  navigate(path) {
    // Guardar ubicación actual en el historial
    if (this.currentLocation.path) {
      this.navigationStack.push({...this.currentLocation});
    }

    // Actualizar ubicación actual
    this.currentLocation = this.parseLocation(path);

    // Si está en Telegram, usar SPA; si no, usar navegación tradicional
    if (this.isInTelegram) {
      this.navigateInApp(path);
    } else {
      window.location.href = path;
    }
  }

  /**
   * Navega dentro de la aplicación sin redireccionar
   * @param {string} path Ruta a navegar
   */
  navigateInApp(path) {
    const location = this.parseLocation(path);
    
    if (location.page === 'canal' && location.stream) {
      // Navegar a canal sin recargar
      console.log(`📱 Navegando a canal: ${location.stream}`);
      
      // Emitir evento personalizado para que canal.js lo maneje
      window.dispatchEvent(new CustomEvent('telegram-navigate-canal', {
        detail: { stream: location.stream }
      }));

      // Actualizar URL sin recargar
      window.history.pushState({ stream: location.stream }, '', path);

      TelegramConnector.showBackButton();
    } else if (location.page === 'index' || location.page === '') {
      // Navegar al inicio
      console.log('📱 Navegando a inicio');
      
      window.dispatchEvent(new CustomEvent('telegram-navigate-home'));
      window.history.pushState({ page: 'index' }, '', path || 'index.html');

      TelegramConnector.hideBackButton();
    }
  }

  /**
   * Retrocede en el historial de navegación
   * @return {boolean} true si se retrocedió, false si no hay historial
   */
  goBack() {
    if (this.navigationStack.length === 0) {
      return false;
    }

    const previousLocation = this.navigationStack.pop();
    this.currentLocation = previousLocation;

    // Navegar a la ubicación anterior
    const path = this.buildPath(previousLocation);
    this.navigateInApp(path);

    // Ocultar botón back si estamos en el inicio
    if (!this.isPageWithBack()) {
      TelegramConnector.hideBackButton();
    }

    return true;
  }

  /**
   * Analiza la ubicación actual
   * @return {Object} Objeto con page, stream, q, etc.
   */
  parseCurrentLocation() {
    const currentPath = window.location.pathname;
    const search = window.location.search;
    
    if (currentPath.includes('canal')) {
      const params = new URLSearchParams(search);
      return {
        path: currentPath,
        page: 'canal',
        stream: params.get('stream') || null
      };
    }
    
    return {
      path: currentPath,
      page: 'index',
      search: search.substring(1)
    };
  }

  /**
   * Analiza una ruta dada
   * @param {string} path Ruta a analizar
   * @return {Object} Objeto con información de la ruta
   */
  parseLocation(path) {
    const url = new URL(path, window.location.origin);
    const pathname = url.pathname;
    const search = new URLSearchParams(url.search);

    if (pathname.includes('canal')) {
      return {
        path: pathname,
        page: 'canal',
        stream: search.get('stream') || null
      };
    }

    return {
      path: pathname,
      page: 'index',
      query: search.get('q') || null
    };
  }

  /**
   * Construye una ruta a partir de un objeto de ubicación
   * @param {Object} location Objeto de ubicación
   * @return {string} Ruta construida
   */
  buildPath(location) {
    if (location.page === 'canal' && location.stream) {
      return `canal.html?stream=${encodeURIComponent(location.stream)}`;
    }
    if (location.page === 'index' && location.query) {
      return `index.html?q=${encodeURIComponent(location.query)}`;
    }
    return 'index.html';
  }

  /**
   * Verifica si la página actual debe mostrar botón back
   * @return {boolean}
   */
  isPageWithBack() {
    return this.currentLocation.page === 'canal' && this.currentLocation.stream;
  }

  /**
   * Obtiene información de la ubicación actual
   */
  getCurrentLocation() {
    return {...this.currentLocation};
  }

  /**
   * Obtiene el historial de navegación
   */
  getNavigationStack() {
    return [...this.navigationStack];
  }
}

export const NavigationManager = new _NavigationManager();
