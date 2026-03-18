/**
 * Servicio de UI para mostrar anuncios bloqueados
 * Muestra notificaciones cuando se detectan y bloquean anuncios
 */

class _AdBlockerUIService {
  constructor() {
    this.blockedCount = 0;
    this.indicatorElement = null;
    this.counterElement = null;
    this.initUI();
  }

  /**
   * Inicializa la UI del bloqueador de anuncios
   */
  initUI() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._createIndicator());
    } else {
      this._createIndicator();
    }
  }

  /**
   * Crea el indicador visual
   */
  _createIndicator() {
    // Crear contenedor de indicador permanente
    const indicator = document.createElement('div');
    indicator.id = 'ad-blocker-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(46, 125, 50, 0.9);
      color: white;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: background 0.3s ease;
    `;
    indicator.innerHTML = '🛡️ Anuncios bloqueados: <span id="ad-counter" style="font-weight: 700;">0</span>';
    document.body.appendChild(indicator);
    this.indicatorElement = indicator;
    this.counterElement = indicator.querySelector('#ad-counter');
  }

  /**
   * Muestra el indicador de anuncio bloqueado
   */
  showBlocked(type = 'anuncio') {
    this.blockedCount++;
    
    // Actualizar contador
    if (this.counterElement) {
      this.counterElement.textContent = this.blockedCount;
      
      // Efecto visual de parpadeo al bloquear
      if (this.indicatorElement) {
        this.indicatorElement.style.background = 'rgba(255, 107, 107, 0.9)';
        setTimeout(() => {
          this.indicatorElement.style.background = 'rgba(46, 125, 50, 0.9)';
        }, 300);
      }
    }

    // Log para debug
    console.log(`[AdBlocker] Anuncio bloqueado: ${type} (Total: ${this.blockedCount})`);
  }

  /**
   * Incrementa contador silenciosamente (para bloqueos en background)
   */
  incrementCounter() {
    this.blockedCount++;
    if (this.counterElement) {
      this.counterElement.textContent = this.blockedCount;
      
      // Efecto visual sutil
      if (this.indicatorElement) {
        this.indicatorElement.style.background = 'rgba(255, 107, 107, 0.9)';
        setTimeout(() => {
          this.indicatorElement.style.background = 'rgba(46, 125, 50, 0.9)';
        }, 300);
      }
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
