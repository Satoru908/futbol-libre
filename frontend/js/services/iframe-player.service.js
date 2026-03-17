export class IframePlayerService {
    constructor(containerElement) {
        this.container = containerElement;
        this.iframe = null;
        this.mask = null;
        this.shield = null;
        this.controls = null;
    }

    /**
     * Inyecta el iframe recortado con el escudo anti-publicidad
     */
    load(streamId) {
        // En lugar de borrar todo el contenedor (que incluye el loader), escondemos/reemplazamos el video original usando su padre
        const videoElement = document.getElementById('canalVideo');
        if (videoElement) {
            videoElement.style.display = 'none'; // ocultamos old player
        }

        // Crear máscara principal
        this.mask = document.createElement('div');
        this.mask.className = 'iframe-mask';
        this.mask.style.position = 'absolute';
        this.mask.style.top = '0';
        this.mask.style.left = '0';
        this.mask.style.width = '100%';
        this.mask.style.height = '100%';
        this.mask.style.backgroundColor = '#000';
        this.mask.style.overflow = 'hidden';

        // 1. Crear el Iframe normal
        // Se ha removido el sandbox para asegurar que P2P Media Loader, WebSockets y demás scripts pesados del reproductor no colapsen
        this.iframe = document.createElement('iframe');
        this.iframe.src = `https://la14hd.com/vivo/canales.php?stream=${streamId}`;
        this.iframe.setAttribute('allowfullscreen', 'true');
        this.iframe.setAttribute('scrolling', 'no');
        this.iframe.className = 'hijacked-iframe';

        // 2. Crear el escudo protector
        this.shield = document.createElement('div');
        this.shield.className = 'player-ad-shield';
        
        // 3. Crear nuestros controles visuales
        this._buildCustomControls();

        // Ensamblar
        this.mask.appendChild(this.iframe);
        this.mask.appendChild(this.shield);
        this.mask.appendChild(this.controls);
        
        this.container.appendChild(this.mask);
        
        this._setupEventListeners();
    }

    _buildCustomControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'custom-player-controls';

        // Instrucción visual inicial
        this.controls.innerHTML = `
            <div class="custom-play-center" id="customPlayBtn">
                <div class="play-icon">▶</div>
                <span>Haz click aquí para activar reproductor original</span>
            </div>
            
            <div class="custom-control-bar">
                <div class="control-left">
                     <!-- El volumen lo maneja la barra inferior original que dejamos destapada -->
                     <span class="control-hint">Volumen en barra inferior</span>
                </div>
                <div class="control-right">
                    <button class="custom-btn" id="customFullscreenBtn">
                        ⛶ Pantalla Completa
                    </button>
                </div>
            </div>
        `;
    }

    _setupEventListeners() {
        const playBtn = this.controls.querySelector('#customPlayBtn');
        const fsBtn = this.controls.querySelector('#customFullscreenBtn');

        // Al hacer click en nuestro play gigante: 
        // Desaparecemos todo nuestro escudo durante 1 segundo para que el usuario pueda darle click al "Play" real del video sin estorbos, 
        // y luego volvemos a poner el escudo para frenar los popups durante el partido.
        playBtn.addEventListener('click', () => {
            playBtn.style.display = 'none';
            this.shield.style.pointerEvents = 'none'; // Permitir click passthrough al iframe vital
            
            // Re-activar escudo anti-clickjacking en 3 segundos (tiempo suficiente para dar "Play" original)
            setTimeout(() => {
                this.shield.style.pointerEvents = 'auto'; // Bloquea todo otra vez
                this.shield.innerHTML = '<div class="shield-active-text">🛡️ Bloqueo de Anuncios Activo. Usa la barra inferior para opciones.</div>';
                
                // Ocultamos el mensaje sutilmente después de unos segundos
                setTimeout(() => {
                    this.shield.innerHTML = '';
                }, 4000);
            }, 3000);
        });

        // Pantalla completa forzada sobre nuestro contenedor propio (encierra el iframe dentro de nuestra web)
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (this.container.requestFullscreen) {
                    this.container.requestFullscreen();
                } else if (this.container.webkitRequestFullscreen) { /* Safari */
                    this.container.webkitRequestFullscreen();
                } else if (this.container.msRequestFullscreen) { /* IE11 */
                    this.container.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
