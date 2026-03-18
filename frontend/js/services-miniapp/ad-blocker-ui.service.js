/**
 * Servicio de UI para mostrar anuncios bloqueados
 * DESHABILITADO: El contador ahora se maneja directamente en canal.js
 */

class _AdBlockerUIService {
  constructor() {
    this.blockedCount = 0;
    this.indicatorElement = null;
    this.counterElement = null;
    // No inicializar UI
  }

  /**
   * Inicializa la UI del bloqueador de anuncios
   * DESHABILITADO: El contador solo se muestra en el reproductor
   */
  initUI() {
    console.log('[AdBlocker] Servicio deshabilitado - contador solo en reproductor');
  }

  /**
   * Muestra el indicador de anuncio bloqueado
   */
  showBlocked(type = 'anuncio') {
    this.blockedCount++;
    console.log(`[AdBlocker] Anuncio bloqueado: ${type} (Total: ${this.blockedCount})`);
  }

  /**
   * Incrementa contador silenciosamente (para bloqueos en background)
   */
  incrementCounter() {
    this.blockedCount++;
  }

  /**
   * Obtiene el total de anuncios bloqueados
   */
  getBlockedCount() {
    return this.blockedCount;
  }
}

export const AdBlockerUIService = new _AdBlockerUIService();
