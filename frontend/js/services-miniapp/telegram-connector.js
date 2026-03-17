/**
 * Conector de Telegram Web Apps
 * Gestiona la inicialización y comunicación con el SDK de Telegram
 * Sin cambios visuales ni de funcionalidad
 */

class _TelegramConnector {
  constructor() {
    this.tgApp = null;
    this.isInTelegram = false;
    this.user = null;
    this.initData = null;
    this.backButtonHandler = null;
  }

  /**
   * Inicializa el conector de Telegram
   * @return {Promise<boolean>} true si está en Telegram, false en caso contrario
   */
  async initialize() {
    try {
      // Verificar si Telegram Web Apps está disponible
      if (!window.Telegram?.WebApp) {
        console.log('📱 Entorno web tradicional (sin Telegram)');
        return false;
      }

      this.tgApp = window.Telegram.WebApp;
      this.isInTelegram = true;

      // Extraer datos del usuario
      this.initData = this.tgApp.initData || '';
      this.user = this.tgApp.initDataUnsafe?.user || null;

      // Notificar a Telegram que la app está lista
      this.tgApp.ready();

      // Expandir la aplicación para llenar la pantalla
      this.tgApp.expand();

      // Configurar tema automático
      this.setupTheme();

      // Habilitar botón de cierre
      this.setupCloseButton();

      // Log de inicialización exitosa
      console.log('✅ Telegram Web App inicializado correctamente');
      if (this.user) {
        console.log('👤 Usuario:', {
          id: this.user.id,
          first_name: this.user.first_name,
          username: this.user.username,
          is_bot: this.user.is_bot
        });
      }

      return true;
    } catch (error) {
      console.warn('⚠️ Error inicializando Telegram:', error.message);
      return false;
    }
  }

  /**
   * Configura el tema según las preferencias del usuario
   */
  setupTheme() {
    if (!this.tgApp) return;

    const isDarkMode = this.tgApp.colorScheme === 'dark';
    document.documentElement.setAttribute('data-telegram-theme', isDarkMode ? 'dark' : 'light');
    
    // Aplicar colores de Telegram si existen
    if (this.tgApp.backgroundColor) {
      document.body.style.backgroundColor = this.tgApp.backgroundColor;
    }
  }

  /**
   * Configura el botón de cierre de Telegram
   */
  setupCloseButton() {
    if (!this.tgApp?.CloseButton) return;

    this.tgApp.CloseButton.show();
  }

  /**
   * Registra un manejador para el botón back de Telegram
   * @param {Function} handler Función a ejecutar cuando se presione back
   */
  onBackButtonClick(handler) {
    if (!this.tgApp?.BackButton) return;

    this.backButtonHandler = handler;
    this.tgApp.BackButton.onClick(handler);
  }

  /**
   * Muestra el botón back
   */
  showBackButton() {
    if (this.tgApp?.BackButton) {
      this.tgApp.BackButton.show();
    }
  }

  /**
   * Oculta el botón back
   */
  hideBackButton() {
    if (this.tgApp?.BackButton) {
      this.tgApp.BackButton.hide();
    }
  }

  /**
   * Envía datos de vuelta a Telegram
   * @param {Object} data Datos a enviar
   */
  sendData(data) {
    if (!this.tgApp) {
      console.warn('No se puede enviar datos: Telegram no disponible');
      return;
    }

    this.tgApp.sendData(JSON.stringify(data));
  }

  /**
   * Muestra un popup
   * @param {Object} params Parámetros del popup
   */
  showPopup(params) {
    if (this.tgApp?.showPopup) {
      this.tgApp.showPopup(params);
    }
  }

  /**
   * Muestra notificación
   * @param {string} message Mensaje a mostrar
   */
  showNotification(message) {
    if (this.tgApp?.showAlert) {
      this.tgApp.showAlert(message);
    }
  }

  /**
   * Abre un link externo
   * @param {string} url URL a abrir
   */
  openLink(url) {
    if (this.tgApp?.openLink) {
      this.tgApp.openLink(url);
    }
  }

  /**
   * Abre TWeb app (si está disponible)
   * @param {string} url URL a abrir
   */
  openTWebApp(url) {
    if (this.tgApp?.openTWebApp) {
      this.tgApp.openTWebApp(url);
    }
  }

  /**
   * Obtiene el identificador único del usuario para analítica
   */
  getUserId() {
    return this.user?.id || null;
  }

  /**
   * Obtiene información del usuario
   */
  getUserInfo() {
    return {
      id: this.user?.id || null,
      firstName: this.user?.first_name || null,
      lastName: this.user?.last_name || null,
      username: this.user?.username || null,
      languageCode: this.user?.language_code || null,
      isPremium: this.user?.is_premium || false,
      isBot: this.user?.is_bot || false
    };
  }

  /**
   * Verifica si está en Telegram
   */
  isRunningInTelegram() {
    return this.isInTelegram;
  }

  /**
   * Obtiene la instancia de WebApp
   */
  getWebApp() {
    return this.tgApp;
  }
}

// Exportar como singleton
export const TelegramConnector = new _TelegramConnector();
