// Configuración de la aplicación
const APP_CONFIG = {
  channelsDataUrl: "data/channels-complete.json",
  defaultLogo: "assets/logos/default.png",
};

// Estado global de la aplicación
const AppState = {
  channels: [],
  filteredChannels: [],
  currentFilter: "all",
  isLoading: false,
};

// Clase principal de la aplicación
class FutbolLibreApp {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.loadChannels();
      this.setupEventListeners();

      // Check URL search params
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q');
      if (query) {
          this.filterBySearch(query);
      } else {
          this.renderChannels();
      }

      this.updateDateBanner();
    } catch (error) {
      console.error("Error inicializando la aplicación:", error);
      this.showError("Error cargando los canales");
    }
  }

  // Cargar datos de canales
  async loadChannels() {
    try {
      AppState.isLoading = true;
      this.showLoading();

      // Simular datos si no existe el archivo JSON
      const channelsData = await this.getChannelsData();
      AppState.channels = channelsData.channels || channelsData;
      AppState.filteredChannels = [...AppState.channels];

      AppState.isLoading = false;
      this.hideLoading();
    } catch (error) {
      AppState.isLoading = false;
      this.hideLoading();
      throw error;
    }
  }

  // Obtener datos de canales (con fallback)
  async getChannelsData() {
    try {
      const response = await fetch(APP_CONFIG.channelsDataUrl);
      if (!response.ok)
        throw new Error("No se pudo cargar el archivo de canales");
      return await response.json();
    } catch (error) {
      console.warn("Usando datos de canales por defecto");
      return this.getDefaultChannelsData();
    }
  }

  // Datos de canales por defecto
  getDefaultChannelsData() {
    const urls = [
      "https://la14hd.com/vivo/canales.php?stream=espn",
      "https://la14hd.com/vivo/canales.php?stream=espn2",
      "https://la14hd.com/vivo/canales.php?stream=espn3",
      "https://la14hd.com/vivo/canales.php?stream=foxsports",
      "https://la14hd.com/vivo/canales.php?stream=foxsports2",
      "https://la14hd.com/vivo/canales.php?stream=foxsports3",
      "https://la14hd.com/vivo/canales.php?stream=dsports",
      "https://la14hd.com/vivo/canales.php?stream=dsports2",
      "https://la14hd.com/vivo/canales.php?stream=golperu",
      "https://la14hd.com/vivo/canales.php?stream=goltv",
      "https://la14hd.com/vivo/canales.php?stream=tycsports",
      "https://la14hd.com/vivo/canales.php?stream=tntsports",
    ];

    return urls.map((url, index) => {
      const streamParam = new URL(url).searchParams.get("stream");
      return {
        id: streamParam,
        name: this.formatChannelName(streamParam),
        url: url,
        category: this.getChannelCategory(streamParam),
        country: "Internacional",
        logo: `assets/logos/${streamParam}.png`,
      };
    });
  }

  // Formatear nombre del canal
  formatChannelName(streamParam) {
    const nameMap = {
      espn: "ESPN",
      espn2: "ESPN 2",
      espn3: "ESPN 3",
      foxsports: "Fox Sports",
      foxsports2: "Fox Sports 2",
      foxsports3: "Fox Sports 3",
      dsports: "DSports",
      dsports2: "DSports 2",
      golperu: "GolPerú",
      goltv: "GolTV",
      tycsports: "TyC Sports",
      tntsports: "TNT Sports",
    };
    return nameMap[streamParam] || streamParam.toUpperCase();
  }

  // Obtener categoría del canal
  getChannelCategory(streamParam) {
    if (streamParam.includes("espn")) return "ESPN";
    if (streamParam.includes("fox")) return "Fox Sports";
    if (streamParam.includes("dsports")) return "DSports";
    if (
      streamParam.includes("gol") ||
      streamParam.includes("liga1") ||
      streamParam.includes("movistar") ||
      streamParam.includes("tyc") ||
      streamParam.includes("win")
    )
      return "Sudamérica";
    if (streamParam.includes("tnt") || streamParam.includes("premium"))
      return "Premium";
    return "Premium";
  }

  // Configurar event listeners
  setupEventListeners() {
    // Ya no hay tabs de filtro
  }

  // Renderizar canales agrupados por categoría
  renderChannels() {
    const container = document.getElementById("channelsContainer");
    if (!container) return;

    container.innerHTML = "";

    // Orden de categorías basado en la14hd.com
    const categoryOrder = [
        "LATINOAMERICA", "ARGENTINA", "PERÚ", "COLOMBIA", 
        "MÉXICO", "USA", "CHILE", "BRASIL", "PORTUGAL", 
        "ESPAÑA", "MUNDO", "OTROS"
    ];

    // Agrupar canales
    const groupedChannels = {};
    // Usar filteredChannels siempre, ya que se inicializa con todos los canales
    const channelsToRender = AppState.filteredChannels;
    
    // Si no hay resultados y estamos filtrando
    if (AppState.currentFilter !== 'all' && channelsToRender.length === 0) {
        container.innerHTML = '<div class="no-results" style="text-align: center; padding: 2rem; color: #aaa;">No se encontraron canales para esta búsqueda.</div>';
        return;
    }

    channelsToRender.forEach(channel => {
        const cat = channel.category || "OTROS";
        if (!groupedChannels[cat]) groupedChannels[cat] = [];
        groupedChannels[cat].push(channel);
    });

    // Renderizar categorías en orden
    categoryOrder.forEach((category, index) => {
        const channels = groupedChannels[category];
        if (channels && channels.length > 0) {
            // Título de la categoría (Acordeón)
            const title = document.createElement("h3");
            title.className = "category-title";
            // Estado inicial: expandir solo el primero
            const isExpanded = index === 0;
            if (!isExpanded) title.classList.add("collapsed");
            
            title.innerHTML = `<span class="tab-text">${category}</span><span class="toggle-icon">${isExpanded ? '−' : '+'}</span>`;
            
            // Grid de canales
            const grid = document.createElement("div");
            grid.className = `channels-grid ${isExpanded ? '' : 'hidden'}`;
            grid.innerHTML = channels.map(c => this.createChannelCardHTML(c)).join("");
            
            // Event Listener para colapsar/expandir
            title.addEventListener("click", () => {
                const wasExpanded = !grid.classList.contains("hidden");
                
                // Toggle visibility
                if (wasExpanded) {
                    grid.classList.add("hidden");
                    title.classList.add("collapsed");
                    title.querySelector(".toggle-icon").textContent = "+";
                } else {
                    grid.classList.remove("hidden");
                    title.classList.remove("collapsed");
                    title.querySelector(".toggle-icon").textContent = "−";
                }
            });

            container.appendChild(title);
            container.appendChild(grid);
        }
    });

    this.attachChannelEventListeners();
  }

  // Crear HTML de tarjeta de canal
  createChannelCardHTML(channel) {
    const logoInitials = channel.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2);

    const hasLogo = channel.logo && channel.logo.startsWith("http");

    // Verificar estado activo (por defecto true si no está definido)
    const isActive = channel.is_active !== false; 
    const statusClass = isActive ? "active" : "inactive";
    const statusText = isActive ? "Activo" : "Inactivo";

    return `
            <div class="channel-card ${statusClass}" data-channel-id="${channel.id}">
                <div class="channel-status-badge ${statusClass}">
                    <span class="status-dot"></span>
                    ${statusText}
                </div>
                <div class="channel-header">
                    <div class="channel-logo">
                        ${
                          hasLogo
                            ? `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="channel-logo-placeholder" style="display:none;">${logoInitials}</div>`
                            : `<div class="channel-logo-placeholder">${logoInitials}</div>`
                        }
                    </div>
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-category">${channel.category}</div>
                </div>
                <div class="channel-body">
                    <p class="channel-description">
                        Ver ${channel.name} online en vivo y en directo.
                    </p>
                    <button class="channel-button" data-id="${channel.id}" data-url="${
                      channel.url || ''
                    }" data-name="${channel.name}">
                        Ver Canal
                    </button>
                </div>
            </div>
        `;
  }

  // Agregar event listeners a los canales
  attachChannelEventListeners() {
    const channelButtons = document.querySelectorAll(".channel-button");
    channelButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        const url = e.target.dataset.url;
        const name = e.target.dataset.name;
        this.openChannel(url, name, id);
      });
    });
  }

  // Abrir canal en modal
  openChannel(url, name, id) {
    if (id && id !== "undefined") {
       window.location.href = `/canal.html?stream=${id}`;
       return;
    }

    // Extraer parámetro stream de la URL
    try {
      const urlObj = new URL(url);
      const streamParam = urlObj.searchParams.get("stream");

      if (streamParam) {
        // Redirigir a la página del canal
        window.location.href = `/canal.html?stream=${streamParam}`;
      } else {
        // Fallback: abrir en nueva ventana
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error procesando URL del canal:", error);
      if (url && url !== "undefined") {
          window.open(url, "_blank");
      } else {
          alert("Error: No se pudo abrir el canal (ID no válido)");
      }
    }
  }

  // Filtrar canales
  filterChannels(filter) {
    console.log("Filtrando por:", filter);
    console.log("Canales disponibles:", AppState.channels.length);

    if (filter === "all") {
      AppState.filteredChannels = [...AppState.channels];
    } else {
      AppState.filteredChannels = AppState.channels.filter((channel) => {
        // Filtrado más flexible
        if (filter === "ESPN") {
          return (
            channel.category === "ESPN" ||
            channel.name.toLowerCase().includes("espn")
          );
        }
        if (filter === "Fox Sports") {
          return (
            channel.category === "Fox Sports" ||
            channel.name.toLowerCase().includes("fox")
          );
        }
        if (filter === "DSports") {
          return (
            channel.category === "DSports" ||
            channel.name.toLowerCase().includes("dsports")
          );
        }
        if (filter === "Sudamérica") {
          return (
            channel.category === "Sudamérica" ||
            channel.country === "Perú" ||
            channel.country === "Argentina" ||
            channel.country === "Colombia" ||
            channel.name.toLowerCase().includes("gol") ||
            channel.name.toLowerCase().includes("liga1") ||
            channel.name.toLowerCase().includes("movistar")
          );
        }
        if (filter === "Premium") {
          return (
            channel.category === "Premium" ||
            channel.name.toLowerCase().includes("tnt") ||
            channel.name.toLowerCase().includes("premium")
          );
        }

        // Fallback: comparación exacta
        return channel.category === filter;
      });
    }

    console.log("Canales filtrados:", AppState.filteredChannels.length);
    this.renderChannels();
  }

  // Filtrar canales por término de búsqueda (URL Search Param)
  filterBySearch(query) {
      if (!query) {
          this.filterChannels("all");
          return;
      }

      console.log(`Filtrando por búsqueda: "${query}"`);
      const term = query.toLowerCase();

      AppState.filteredChannels = AppState.channels.filter(channel => {
          // Búsqueda en nombre, categoría y descripción (simulada)
          const nameMatch = channel.name.toLowerCase().includes(term);
          const catMatch = channel.category && channel.category.toLowerCase().includes(term);
          // También podemos buscar coincidencias "inteligentes"
          // Ejemplo: 'champions' -> ESPN, Fox
          let smartMatch = false;
          if (term.includes('champions') || term.includes('libertadores')) {
             smartMatch = channel.name.toLowerCase().includes('espn') || channel.name.toLowerCase().includes('fox');
          }
          if (term.includes('laliga')) {
             smartMatch = channel.name.toLowerCase().includes('dsports') || channel.name.toLowerCase().includes('espn');
          }
          if (term.includes('premier')) {
             smartMatch = channel.name.toLowerCase().includes('espn');
          }

          return nameMatch || catMatch || smartMatch;
      });

      AppState.currentFilter = 'search';
      this.renderChannels();
      
      // Actualizar UI para mostrar qué se está buscando?
      // Por ahora solo filtramos
  }

  // Establecer filtro activo
  setActiveFilter(filter) {
    AppState.currentFilter = filter;

    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach((tab) => {
      tab.classList.remove("active");
      if (tab.dataset.filter === filter) {
        tab.classList.add("active");
      }
    });
  }

  // Mostrar loading
  showLoading() {
    const grid = document.getElementById("channelsGrid");
    if (grid) {
      grid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Cargando canales...</p>
                </div>
            `;
    }
  }

  // Ocultar loading
  hideLoading() {
    // El loading se oculta automáticamente al renderizar los canales
  }

  // Mostrar error
  showError(message) {
    const grid = document.getElementById("channelsGrid");
    if (grid) {
      grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
    }
  }

  // HTML para estado vacío
  getEmptyStateHTML() {
    return `
            <div class="empty-state">
                <div class="empty-state-icon">📺</div>
                <h3>No hay canales disponibles</h3>
                <p>No se encontraron canales para el filtro seleccionado.</p>
            </div>
        `;
  }

  // Actualizar banner de fecha
  updateDateBanner() {
    const dateBanner = document.querySelector(".date-banner span");
    if (dateBanner) {
      const now = new Date();
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const dateString = now.toLocaleDateString("es-ES", options);
      dateBanner.textContent = `Agenda - ${dateString}`;
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new FutbolLibreApp();
});
