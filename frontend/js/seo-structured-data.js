// Datos estructurados para SEO

class SEOStructuredData {
  constructor() {
    this.init();
  }

  init() {
    this.addBreadcrumbData();
    this.addOrganizationData();
    this.addWebsiteData();
    this.addChannelData();
  }

  // Breadcrumb Schema
  addBreadcrumbData() {
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: "https://futbollibrevivo.netlify.app/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Canales de Fútbol",
          item: "https://futbollibrevivo.netlify.app/#canales",
        },
      ],
    };

    this.addStructuredData(breadcrumbData);
  }

  // Organization Schema
  addOrganizationData() {
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fútbol Libre Vivo",
      alternateName: "Futbol Libre Vivo",
      url: "https://futbollibrevivo.netlify.app",
      logo: {
        "@type": "ImageObject",
        url: "https://futbollibrevivo.netlify.app/images/logo.png",
        width: 200,
        height: 60,
      },
      description:
        "Plataforma para ver fútbol en vivo gratis online con canales deportivos en HD",
      foundingDate: "2025",
      sameAs: [
        "https://twitter.com/futbollibre",
        "https://facebook.com/futbollibre",
        "https://instagram.com/futbollibre",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["Spanish", "English"],
      },
    };

    this.addStructuredData(organizationData);
  }

  // Website Schema
  addWebsiteData() {
    const websiteData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Fútbol Libre Vivo",
      url: "https://futbollibrevivo.netlify.app",
      description:
        "Ver fútbol en vivo gratis online. ESPN, Fox Sports, DSports y más canales deportivos en HD sin anuncios.",
      inLanguage: "es-ES",
      isAccessibleForFree: true,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate:
            "https://futbollibrevivo.netlify.app/buscar?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
      mainEntity: {
        "@type": "ItemList",
        name: "Canales de Fútbol en Vivo",
        description:
          "Lista de canales deportivos disponibles para ver fútbol gratis",
        numberOfItems: 100,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ESPN en vivo",
            url: "https://futbollibrevivo.netlify.app/canal.html?stream=espn",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Fox Sports en vivo",
            url: "https://futbollibrevivo.netlify.app/canal.html?stream=foxsports",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "DSports en vivo",
            url: "https://futbollibrevivo.netlify.app/canal.html?stream=dsports",
          },
        ],
      },
    };

    this.addStructuredData(websiteData);
  }

  // Channel Data Schema
  addChannelData() {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const stream = urlParams.get("stream");

    if (stream && currentUrl.includes("canal.html")) {
      const channelName = this.getChannelName(stream);
      const channelData = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${channelName} en vivo`,
        description: `Ver ${channelName} online gratis en HD. Transmisión en vivo de deportes y fútbol.`,
        thumbnailUrl: this.getChannelLogo(stream),
        uploadDate: new Date().toISOString(),
        duration: "PT0H0M0S",
        embedUrl: currentUrl,
        isLiveBroadcast: true,
        publication: {
          "@type": "BroadcastEvent",
          isLiveBroadcast: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        publisher: {
          "@type": "Organization",
          name: "Fútbol Libre Vivo",
          logo: {
            "@type": "ImageObject",
            url: "https://futbollibrevivo.netlify.app/images/logo.png",
          },
        },
      };

      this.addStructuredData(channelData);
    }
  }

  // Agregar datos estructurados al DOM
  addStructuredData(data) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data, null, 2);
    document.head.appendChild(script);
  }

  // Obtener nombre del canal
  getChannelName(stream) {
    const channelNames = {
      espn: "ESPN",
      espn2: "ESPN 2",
      espn3: "ESPN 3",
      foxsports: "Fox Sports",
      foxsports2: "Fox Sports 2",
      foxsports3: "Fox Sports 3",
      dsports: "DSports",
      dsports2: "DSports 2",
      golperu: "GolPerú",
      liga1max: "Liga1 MAX",
    };
    return channelNames[stream] || stream.toUpperCase();
  }

  // Obtener logo del canal
  getChannelLogo(stream) {
    const logoMap = {
      espn: "https://img.golazoplay.com/uploads/espn_16110aaa3a.webp",
      foxsports:
        "https://img.golazoplay.com/uploads/fox_sports_1_7dbc294272.webp",
      dsports: "https://img.golazoplay.com/uploads/dsports_bea74cb844.webp",
      golperu: "https://img.golazoplay.com/uploads/gol_peru_7167cd54dd.webp",
    };
    return (
      logoMap[stream] ||
      "https://futbollibrevivo.netlify.app/images/default-channel.png"
    );
  }

  // Actualizar meta tags dinámicamente
  updateMetaTags(channelName, channelDescription) {
    // Actualizar title
    document.title = `${channelName} en vivo - Ver gratis online HD | Fútbol Libre Vivo`;

    // Actualizar description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.content = `Ver ${channelName} en vivo gratis online HD. ${channelDescription} Transmisión deportiva sin anuncios en Fútbol Libre Vivo.`;
    }

    // Actualizar Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.content = `${channelName} en vivo - Fútbol Libre Vivo`;
    }

    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    if (ogDescription) {
      ogDescription.content = `Ver ${channelName} en vivo gratis online HD. Transmisión deportiva sin anuncios.`;
    }
  }
}

// Inicializar SEO cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new SEOStructuredData();
});

// Exportar para uso global
window.SEOStructuredData = SEOStructuredData;
