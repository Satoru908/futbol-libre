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
   * NOTA: El contador ahora solo se muestra en el reproductor de video
   */
  initUI() {
    // No crear indicador global, se crea solo en el reproductor
    console.log('[AdBlocker] Servicio inicializado (contador solo en reproductor)');
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
