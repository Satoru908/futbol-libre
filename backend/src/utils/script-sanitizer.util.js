/**
 * Script Sanitizer Utility
 * 
 * Módulo encargado de eliminar scripts maliciosos (anuncios pop-ups, trackers, etc.)
 * del HTML sin corromper el código funcional del reproductor.
 * 
 * Estrategia:
 * 1. Elimina etiquetas <script> con patrones sospechosos (pop-ups, ads, tracking)
 * 2. Mantiene scripts esenciales para el funcionamiento del reproductor
 * 3. Serializa el HTML limpio sin perder la funcionalidad original
 */

const logger = require('./logger');

class ScriptSanitizer {
  constructor() {
    // Patrones de scripts maliciosos a eliminar
    this.maliciousPatterns = [
      /window\.open\s*\(/gi,                    // Detecta window.open() - abre pop-ups
      /pop\s*up|runPop|popupCode/gi,           // Palabras clave: "popup", "runPop", "popupCode"
      /advertisement|ads|adv|banner|ad-?code/gi, // Palabras clave publicitarias
      /google\.analytics|gtag/gi,                // Tracking analytics (Google Tag Manager)
      /ga\s*\(\s*['"]send['"]/gi,              // Google Analytics events
      /document\.write/gi,                       // Código que escribe en documento (frecuente en ads)
      /innerhtml\s*=|\.html\s*\(/gi,           // InnerHTML dinamico (posibles ads)
      /eval\s*\(/gi,                           // Eval - código dinámico malicioso
      /new\s+Function\s*\(/gi,                 // Constructor de funciones dinámicas
      /aclib|adlib|adwb|adnw|propeller/gi,    // Librerías de ads comunes
      /(setTimeout|setInterval).*?(popup|ad|window\.open)/gi, // Timeout/Interval con ads
      /fetch\s*\(\s*['"][^'"]*ad/gi,          // Fetch de recursos publicitarios
    ];

    // Patrones de atributos en elementos que pueden ejecutar pop-ups
    this.maliciousAttributes = [
      /on(mouse|click|load|error|touch)/gi, // Event handlers (onclick, onload, etc.)
    ];
  }

  /**
   * Elimina scripts de HTML basado en patrones maliciosos
   * @param {string} html - HTML crudo a sanitizar
   * @returns {string} - HTML limpio
   */
  sanitizeScriptTags(html) {
    try {
      let cleanHtml = html;

      // Regex para eliminar etiquetas <script> y su contenido
      // Captura: <script ...contenido...</script>
      cleanHtml = cleanHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, (match) => {
        // Verificar si el script contiene patrones maliciosos
        if (this.containsMaliciousPattern(match)) {
          logger.info('Script malicioso eliminado (contiene patrones sospechosos)');
          return ''; // Eliminar el script completo
        }
        // Si el script es "safe" (ej: reproducción de video), mantenerlo
        return match;
      });

      return cleanHtml;
    } catch (error) {
      logger.error('Error sanitizando script tags:', error.message);
      return html; // Retornar HTML original si falla
    }
  }

  /**
   * Verifica si el contenido de un script contiene patrones maliciosos
   * @param {string} scriptContent - Contenido del script a verificar
   * @returns {boolean} - true si contiene patrones maliciosos
   */
  containsMaliciousPattern(scriptContent) {
    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(scriptContent)) {
        pattern.lastIndex = 0; // Reset regex
        return true;
      }
    }
    return false;
  }

  /**
   * Elimina atributos event listeners sospechosos de elementos HTML
   * @param {string} html - HTML a limpiar
   * @returns {string} - HTML con atributos limpios
   */
  sanitizeAttributes(html) {
    try {
      let cleanHtml = html;

      // Eliminar eventos que puedan disparar pop-ups
      // Buscar patrones como: onclick="...", onload="...", etc.
      cleanHtml = cleanHtml.replace(/\s*on(mouse|click|load|error|touch|focus|blur|change)\s*=\s*["'][^"']*["']/gi, '');

      return cleanHtml;
    } catch (error) {
      logger.error('Error sanitizando atributos:', error.message);
      return html;
    }
  }

  /**
   * Elimina iframes sospechosos (frecuentemente usado para anuncios)
   * @param {string} html - HTML a limpiar
   * @returns {string} - HTML sin iframes maliciosos
   */
  sanitizeIframes(html) {
    try {
      let cleanHtml = html;

      // Eliminar iframes que apunten a dominios publicitarios conocidos
      cleanHtml = cleanHtml.replace(/<iframe[^>]*src=["']([^"']*ads|advertising|doubleclick|google-analytics)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi, (match) => {
        logger.info('Iframe publicitario eliminado');
        return '';
      });

      return cleanHtml;
    } catch (error) {
      logger.error('Error sanitizando iframes:', error.message);
      return html;
    }
  }

  /**
   * Sanitiza completamente el HTML:
   * 1. Elimina scripts maliciosos
   * 2. Elimina atributos event listeners sospechosos
   * 3. Elimina iframes publicitarios
   * 
   * @param {string} html - HTML crudo
   * @returns {string} - HTML limpio y seguro
   */
  sanitize(html) {
    if (!html || typeof html !== 'string') {
      logger.warn('HTML inválido recibido en sanitizer');
      return '';
    }

    logger.info('Iniciando sanitización de HTML');

    let cleanHtml = html;

    // Aplicar sanitización en orden de importancia
    cleanHtml = this.sanitizeScriptTags(cleanHtml);
    cleanHtml = this.sanitizeAttributes(cleanHtml);
    cleanHtml = this.sanitizeIframes(cleanHtml);

    logger.info('Sanitización completada exitosamente');
    return cleanHtml;
  }
}

// Exportar como singleton para reutilizar instancia
module.exports = new ScriptSanitizer();
