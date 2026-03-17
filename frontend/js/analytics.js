// Google Analytics y tracking para SEO
import { APP_CONFIG } from './config/constants.js';

class AnalyticsManager {
  constructor() {
    this.init();
  }

  init() {
    // Analytics desactivado
    // this.setupGoogleAnalytics();
    // this.setupGoogleTagManager();
    // this.setupSearchConsole();
    // this.trackUserBehavior();
  }

  // Google Analytics 4
  setupGoogleAnalytics() {
    // Get GA_MEASUREMENT_ID from environment config
    const GA_MEASUREMENT_ID = APP_CONFIG.gaId;
    
    // Skip if GA_ID is not configured
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === '') {
      console.log('Google Analytics not configured (VITE_GA_ID not set)');
      return;
    }

    // Cargar gtag
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gtagScript);

    // Configurar gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
      custom_map: {
        custom_parameter_1: "channel_name",
        custom_parameter_2: "channel_category",
      },
    });

    // Hacer gtag disponible globalmente
    window.gtag = gtag;
  }

  // Google Tag Manager
  setupGoogleTagManager() {
    // Reemplaza 'GTM-XXXXXXX' con tu ID real de GTM
    const GTM_ID = "GTM-XXXXXXX";

    // GTM Script
    const gtmScript = document.createElement("script");
    gtmScript.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');
    `;
    document.head.appendChild(gtmScript);

    // GTM NoScript fallback
    const gtmNoScript = document.createElement("noscript");
    gtmNoScript.innerHTML = `
      <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe>
    `;
    document.body.insertBefore(gtmNoScript, document.body.firstChild);
  }

  // Google Search Console
  setupSearchConsole() {
    // Reemplaza con tu código de verificación real
    const searchConsoleVerification = document.createElement("meta");
    searchConsoleVerification.name = "google-site-verification";
    searchConsoleVerification.content = "tu-codigo-de-verificacion-aqui";
    document.head.appendChild(searchConsoleVerification);
  }

  // Tracking de comportamiento del usuario
  trackUserBehavior() {
    // Track channel views
    this.trackChannelViews();

    // Track search behavior
    this.trackSearchBehavior();

    // Track engagement
    this.trackEngagement();

    // Track errors
    this.trackErrors();
  }

  // Tracking de visualizaciones de canales
  trackChannelViews() {
    const urlParams = new URLSearchParams(window.location.search);
    const stream = urlParams.get("stream");

    if (stream && window.location.pathname.includes("canal.html")) {
      // Enviar evento a GA4
      if (window.gtag) {
        gtag("event", "channel_view", {
          channel_name: stream,
          channel_category: this.getChannelCategory(stream),
          page_title: document.title,
          page_location: window.location.href,
        });
      }

      // Enviar evento a GTM
      if (window.dataLayer) {
        dataLayer.push({
          event: "channel_view",
          channel_name: stream,
          channel_category: this.getChannelCategory(stream),
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Tracking de búsquedas
  trackSearchBehavior() {
    // Track filter usage
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-tab")) {
        const filterValue = e.target.dataset.filter;

        if (window.gtag) {
          gtag("event", "filter_used", {
            filter_type: filterValue,
            page_title: document.title,
          });
        }
      }
    });

    // Track channel clicks
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("channel-button")) {
        const channelName = e.target.dataset.name;
        const channelUrl = e.target.dataset.url;

        if (window.gtag) {
          gtag("event", "channel_click", {
            channel_name: channelName,
            channel_url: channelUrl,
            click_location: "channel_grid",
          });
        }
      }
    });
  }

  // Tracking de engagement
  trackEngagement() {
    let startTime = Date.now();
    let maxScroll = 0;

    // Track scroll depth
    window.addEventListener("scroll", () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
          100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Track milestone scrolls
        if (scrollPercent >= 25 && scrollPercent < 50) {
          this.trackScrollMilestone(25);
        } else if (scrollPercent >= 50 && scrollPercent < 75) {
          this.trackScrollMilestone(50);
        } else if (scrollPercent >= 75) {
          this.trackScrollMilestone(75);
        }
      }
    });

    // Track time on page
    window.addEventListener("beforeunload", () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);

      if (window.gtag) {
        gtag("event", "page_engagement", {
          time_on_page: timeOnPage,
          max_scroll_percent: maxScroll,
          page_title: document.title,
        });
      }
    });
  }

  // Track scroll milestones
  trackScrollMilestone(percent) {
    if (window.gtag) {
      gtag("event", "scroll", {
        percent_scrolled: percent,
        page_title: document.title,
      });
    }
  }

  // Tracking de errores
  trackErrors() {
    window.addEventListener("error", (e) => {
      if (window.gtag) {
        gtag("event", "exception", {
          description: e.message,
          fatal: false,
          page_title: document.title,
        });
      }
    });

    // Track 404 errors
    if (
      document.title.includes("404") ||
      document.body.textContent.includes("Page not found")
    ) {
      if (window.gtag) {
        gtag("event", "404_error", {
          page_location: window.location.href,
          referrer: document.referrer,
        });
      }
    }
  }

  // Obtener categoría del canal
  getChannelCategory(stream) {
    if (stream.includes("espn")) return "ESPN";
    if (stream.includes("fox")) return "Fox Sports";
    if (stream.includes("dsports")) return "DSports";
    if (stream.includes("gol")) return "Sudamerica";
    return "Premium";
  }

  // Método público para tracking personalizado
  static trackCustomEvent(eventName, parameters = {}) {
    if (window.gtag) {
      gtag("event", eventName, parameters);
    }

    if (window.dataLayer) {
      dataLayer.push({
        event: eventName,
        ...parameters,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Inicializar Analytics
document.addEventListener("DOMContentLoaded", () => {
  new AnalyticsManager();
});

// Exportar para uso global
window.AnalyticsManager = AnalyticsManager;
