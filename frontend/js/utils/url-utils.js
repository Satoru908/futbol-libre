/**
 * Utilidades para manejo de URLs
 */
export class UrlUtils {
  /**
   * Extrae parámetro de query string
   */
  static getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /**
   * Extrae parámetro stream de una URL
   */
  static extractStreamParam(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('stream');
    } catch {
      // Si no es URL válida, intentar extraer manualmente
      const match = url.match(/stream=([^&]+)/);
      return match ? match[1] : null;
    }
  }

  /**
   * Valida si es una URL válida
   */
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construye URL de canal
   */
  static buildChannelUrl(streamId) {
    return `/canal?stream=${streamId}`;
  }
}
