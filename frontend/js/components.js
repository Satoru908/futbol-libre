/**
 * Componentes reutilizables y utilidades
 */

// Utilidades para localStorage
const StorageUtils = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  },

  load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando de localStorage:', error);
      return null;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error eliminando de localStorage:', error);
      return false;
    }
  }
};

// Componente de notificaciones
class NotificationManager {
  constructor() {
    this.container = this._createContainer();
  }

  _createContainer() {
    const container = document.createElement('div');
    container.className = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }

  show(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: ${this._getBackgroundColor(type)};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;

    this.container.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      this._remove(notification);
    }, duration);

    return notification;
  }

  _remove(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  _getBackgroundColor(type) {
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    return colors[type] || colors.info;
  }
}

// Detector de dispositivo
const DeviceUtils = {
  isMobile() {
    return window.innerWidth <= 768;
  },

  isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  },

  isDesktop() {
    return window.innerWidth > 1024;
  },

  getDeviceType() {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }
};

// Exportar utilidades globalmente
window.StorageUtils = StorageUtils;
window.notifications = new NotificationManager();
window.DeviceUtils = DeviceUtils;
