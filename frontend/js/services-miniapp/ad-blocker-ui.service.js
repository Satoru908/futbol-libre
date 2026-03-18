/**
 * Servicio de UI para mostrar anuncios bloqueados
 * DESHABILITADO: El contador ahora se maneja directamente en canal.js
 */

class _AdBlockerUIService {
  constructor() {
    this.blockedCount = 0;
    // No inicializar UI
  }

  initUI() {
    // Deshabilitado - el contador solo se muestra en el reproductor
  }

  showBlocked(type = 'anuncio') {
    this.blockedCount++;
  }

  incrementCounter() {
    this.blockedCount++;
  }

  getBlockedCount() {
    return this.blockedCount;
  }
}

export const AdBlockerUIService = new _AdBlockerUIService();
