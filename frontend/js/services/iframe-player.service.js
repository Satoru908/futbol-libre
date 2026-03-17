import { APP_CONFIG } from '../config/constants.js';

/**
 * IframePlayerService
 * 
 * Servicio encargado de cargar y mostrar streams usando un iframe con HTML sanitizado.
 * 
 * Arquitectura:
 * - Carga HTML desde backend (/api/stream-html-cleaned) que ya tiene anuncios removidos
 * - No requiere escudo invasivo ya que el HTML está limpio
 * - Mantiene controles simples para UX intuitiva
 */
export class IframePlayerService {
    constructor(containerElement) {
        this.container = containerElement;
        this.iframe = null;
        this.mask = null;
        this.controls = null;
        
        // Configuración
        this.apiBaseUrl = APP_CONFIG.apiBaseUrl;
    }

    /**
     * Carga el stream sanitizado en un iframe
     * 
     * @param {string} streamId - ID del stream a cargar
     * @throws {Error} Si falta el contenedor o streamId
     */
    load(streamId) {
        if (!streamId) {
            throw new Error('streamId es requerido para cargar el reproductor');
        }

        // Ocultar el elemento de video anterior si existe
        const videoElement = document.getElementById('canalVideo');
        if (videoElement) {
            videoElement.style.display = 'none';
        }

        // Crear máscara principal que contiene todo
        this.mask = document.createElement('div');
        this.mask.className = 'iframe-mask';
        this.mask.style.position = 'absolute';
        this.mask.style.top = '0';
        this.mask.style.left = '0';
        this.mask.style.right = '0';
        this.mask.style.bottom = '0';
        this.mask.style.backgroundColor = '#000';
        this.mask.style.overflow = 'hidden';

        // Crear iframe que apunta al backend sanitizador
        // El backend obtiene el HTML de la14hd y remueve scripts maliciosos
        this.iframe = document.createElement('iframe');
        this.iframe.src = `${this.apiBaseUrl}/stream-html-cleaned?stream=${encodeURIComponent(streamId)}`;
        this.iframe.setAttribute('allowfullscreen', 'true');
        this.iframe.setAttribute('scrolling', 'no');
        this.iframe.className = 'hijacked-iframe';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';

        // Crear controles personalizados simples
        this._buildCustomControls();

        // Ensamblar componentes
        this.mask.appendChild(this.iframe);
        this.mask.appendChild(this.controls);
        this.container.appendChild(this.mask);

        // Configurar event listeners
        this._setupEventListeners();
    }

    /**
     * Construye los controles personalizados del reproductor
     * 
     * Nota: El HTML ya está sanitizado desde el backend, así que no necesitamos
     * escudos invasivos. Solo mantenemos controles básicos para mejorar UX.
     */
    _buildCustomControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'custom-player-controls';
        this.controls.style.position = 'absolute';
        this.controls.style.bottom = '0';
        this.controls.style.left = '0';
        this.controls.style.right = '0';
        this.controls.style.display = 'flex';
        this.controls.style.justifyContent = 'flex-end';
        this.controls.style.alignItems = 'center';
        this.controls.style.gap = '10px';
        this.controls.style.padding = '10px';
        this.controls.style.background = 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))';
        this.controls.style.zIndex = '100';

        this.controls.innerHTML = `
            <button class="control-btn" id="customFullscreenBtn" title="Pantalla completa">
                <span style="font-size: 18px;">⛶</span>
            </button>
        `;
    }

    /**
     * Configura los event listeners de los controles
     * 
     * Con HTML sanitizado, la interacción es mucho más segura.
     */
    _setupEventListeners() {
        const fsBtn = this.controls.querySelector('#customFullscreenBtn');

        if (fsBtn) {
            fsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._toggleFullscreen();
            });
        }

        // Log de carga exitosa
        if (this.iframe) {
            this.iframe.onload = () => {
                console.log('✓ Stream cargado exitosamente desde backend sanitizado');
            };

            this.iframe.onerror = () => {
                console.error('✗ Error al cargar stream desde backend');
            };
        }
    }

    /**
     * Alterna el modo de pantalla completa
     */
    _toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) { 
                // Safari
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) { 
                // IE11
                this.container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    /**
     * Limpia los recursos del reproductor
     */
    destroy() {
        if (this.iframe) {
            this.iframe.src = 'about:blank';
            this.iframe = null;
        }

        if (this.mask && this.mask.parentNode) {
            this.mask.parentNode.removeChild(this.mask);
            this.mask = null;
        }

        if (this.controls && this.controls.parentNode) {
            this.controls.parentNode.removeChild(this.controls);
            this.controls = null
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
