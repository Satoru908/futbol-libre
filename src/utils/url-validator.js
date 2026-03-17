/**
 * Utilidades para validación de URLs
 */
class UrlValidator {
  /**
   * Valida que una URL sea válida y segura
   */
  isValid(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Valida que una URL sea de un dominio permitido
   */
  isAllowedDomain(url, allowedDomains = []) {
    if (allowedDomains.length === 0) return true;
    
    try {
      const urlObj = new URL(url);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrae el parámetro stream de una URL
   */
  extractStreamParam(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('stream');
    } catch {
      return null;
    }
  }
}

module.exports = new UrlValidator();
