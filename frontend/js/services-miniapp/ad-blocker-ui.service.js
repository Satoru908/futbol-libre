/**
 * Servicio de UI para mostrar anuncios bloqueados
 * Muestra notificaciones cuando se detectan y bloquean anuncios
 */

class _AdBlockerUIService {
  constructor() {
    this.blockedCount = 0;
    this.indicatorElement = null;
    this.notificationQueue = [];
    this.initUI();
  }

  /**
   * Inicializa la UI del bloqueador de anuncios
   */
  initUI() {
    // Crear contenedor de indicador
    const indicator = document.createElement('div');
    indicator.id = 'ad-blocker-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    indicator.textContent = '🚫 Anuncio Bloqueado';
    document.body.appendChild(indicator);
    this.indicatorElement = indicator;

    // Crear notificación flotante
    const notification = document.createElement('div');
    notification.id = 'ad-blocker-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      left: 10px;
      background: #333;
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 999999;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 200px;
      word-wrap: break-word;
    `;
    document.body.appendChild(notification);
  }

  /**
   * Muestra el indicador de anuncio bloqueado
   */
  showBlocked(type = 'anuncio') {
    this.blockedCount++;
    
    // Actualizar indicador
    if (this.indicatorElement) {
      this.indicatorElement.textContent = `🚫 ${this.blockedCount} Bloqueado${this.blockedCount > 1 ? 's' : ''}`;
      this.indicatorElement.style.display = 'flex';
      this.indicatorElement.style.alignItems = 'center';
      this.indicatorElement.style.justifyContent = 'center';
      
      // Auto-ocultar después de 3 segundos
      setTimeout(() => {
        if (this.blockedCount === this.blockedCount) {
          this.indicatorElement.style.display = 'none';
        }
      }, 3000);
    }

    // Mostrar notificación con detalles
    console.log(`[AdBlocker] Anuncio bloqueado: ${type}`);
  }

  /**
   * Incrementa contador silenciosamente (para bloqueos en background)
   */
  incrementCounter() {
    this.blockedCount++;
    if (this.indicatorElement) {
      this.indicatorElement.textContent = `🚫 ${this.blockedCount} Bloqueado${this.blockedCount > 1 ? 's' : ''}`;
      this.indicatorElement.style.display = 'flex';
    }
  }

  /**
   * Obtiene el total de anuncios bloqueados
   */
  getBlockedCount() {
    return this.blockedCount;
  }
}

export const AdBlockerUIService = new _AdBlockerUIService();
