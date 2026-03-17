/**
 * Servicio API mejorado para Telegram Mini Apps
 * Añade información del usuario de Telegram a las llamadas a la API
 */

import { TelegramConnector } from './telegram-connector.js';

class _TelegramAwareApiService {
  constructor() {
    this.telegramUserId = null;
    this.initialized = false;
  }

  /**
   * Inicializa el servicio con información de Telegram
   */
  async initialize() {
    this.telegramUserId = TelegramConnector.getUserId();
    this.initialized = true;
    
    if (this.telegramUserId) {
      console.log(`🔗 API Service conectado a usuario de Telegram: ${this.telegramUserId}`);
    }
  }

  /**
   * Realiza una llamada fetch mejorada con datos de Telegram
   * @param {string} url URL a llamar
   * @param {Object} options Opciones de fetch
   * @return {Promise<Response>}
   */
  async fetch(url, options = {}) {
    // Añadir header con ID de usuario de Telegram si está disponible
    if (this.telegramUserId) {
      options.headers = options.headers || {};
      options.headers['X-Telegram-User-Id'] = this.telegramUserId;
    }

    // Timeout por defecto para evitar cuelgues en Telegram
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout en la solicitud a ${url}`);
      }
      throw error;
    }
  }

  /**
   * Obtiene datos JSON con soporte para Telegram
   * @param {string} url URL a llamar
   * @return {Promise<Object>}
   */
  async fetchJson(url) {
    const response = await this.fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} en ${url}`);
    }

    return await response.json();
  }

  /**
   * Registra una interacción del usuario en el backend
   * @param {string} action Acción realizada
   * @param {Object} metadata Metadatos adicionales
   */
  async trackInteraction(action, metadata = {}) {
    if (!this.telegramUserId) {
      return; // No trackear si no hay usuario
    }

    try {
      const apiBaseUrl = this.getApiBaseUrl();
      await this.fetch(`${apiBaseUrl}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          telegramUserId: this.telegramUserId,
          timestamp: new Date().toISOString(),
          metadata
        })
      });
    } catch (error) {
      // Silenciar errores de tracking
      console.warn('⚠️ Error al registrar interacción:', error.message);
    }
  }

  /**
   * Obtiene la URL base de la API
   */
  getApiBaseUrl() {
    // Importar dinámicamente para evitar dependencias circulares
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.apiBaseUrl) {
      return APP_CONFIG.apiBaseUrl;
    }

    // Fallback
    return window.location.hostname === 'localhost'
      ? 'http://localhost:8787/api'
      : 'https://futbol-libre-production-5102.up.railway.app/api';
  }
}

export const TelegramAwareApiService = new _TelegramAwareApiService();
