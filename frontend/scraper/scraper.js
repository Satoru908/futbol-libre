// Script para extraer links de canales de la14hd.com
// Ejecutar en la consola del navegador o como script de Node.js

class ChannelScraper {
  constructor() {
    this.baseUrl = "https://la14hd.com/";
    this.channels = [];
  }

  // Función para scraping en el navegador (consola)
  scrapeBrowser() {
    console.log("🔍 Iniciando scraping de canales...");

    const channelElements = document.querySelectorAll("[data-canal]");
    const channels = [];

    channelElements.forEach((element, index) => {
      try {
        // Extraer nombre del canal
        const canalName = element.getAttribute("data-canal");

        // Extraer estado del canal
        const statusElement = element.querySelector(".status-text");
        const isActive = statusElement
          ? !statusElement.classList.contains("text-offline")
          : false;
        const statusText = statusElement
          ? statusElement.textContent.trim()
          : "Desconocido";

        // Extraer link
        const linkElement = element.querySelector('a[href*="canales.php"]');
        const link = linkElement ? linkElement.href : null;

        // Extraer nombre mostrado (puede ser diferente al data-canal)
        const displayNameElement = element.querySelector(".font-bold");
        const displayName = displayNameElement
          ? displayNameElement.textContent.trim()
          : canalName;

        if (link) {
          const channelData = {
            id: index + 1,
            name: canalName,
            displayName: displayName,
            url: link,
            status: isActive ? "Activo" : "Inactivo",
            isActive: isActive,
            streamParam: this.extractStreamParam(link),
          };

          channels.push(channelData);
          console.log(
            `✅ Canal ${index + 1}: ${displayName} - ${channelData.status}`
          );
        }
      } catch (error) {
        console.error(`❌ Error procesando canal ${index + 1}:`, error);
      }
    });

    this.channels = channels;
    this.displayResults();
    return channels;
  }

  // Extraer parámetro stream de la URL
  extractStreamParam(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("stream") || null;
    } catch (error) {
      return null;
    }
  }

  // Mostrar resultados en consola
  displayResults() {
    console.log("\n📊 RESUMEN DE CANALES ENCONTRADOS:");
    console.log("=====================================");

    const activeChannels = this.channels.filter((ch) => ch.isActive);
    const inactiveChannels = this.channels.filter((ch) => !ch.isActive);

    console.log(`📺 Total de canales: ${this.channels.length}`);
    console.log(`🟢 Canales activos: ${activeChannels.length}`);
    console.log(`🔴 Canales inactivos: ${inactiveChannels.length}`);

    console.log("\n🟢 CANALES ACTIVOS:");
    activeChannels.forEach((ch) => {
      console.log(`  • ${ch.displayName} - ${ch.url}`);
    });

    console.log("\n🔴 CANALES INACTIVOS:");
    inactiveChannels.forEach((ch) => {
      console.log(`  • ${ch.displayName} - ${ch.url}`);
    });

    console.log("\n📋 DATOS COMPLETOS (JSON):");
    console.log(JSON.stringify(this.channels, null, 2));
  }

  // Exportar a diferentes formatos
  exportToJSON() {
    const jsonData = JSON.stringify(this.channels, null, 2);
    console.log("📄 Datos en formato JSON:");
    console.log(jsonData);

    // Crear archivo descargable
    this.downloadFile(jsonData, "canales.json", "application/json");
    return jsonData;
  }

  exportToCSV() {
    const headers = [
      "ID",
      "Nombre",
      "Nombre Mostrado",
      "URL",
      "Estado",
      "Activo",
      "Stream Param",
    ];
    const csvContent = [
      headers.join(","),
      ...this.channels.map((ch) =>
        [
          ch.id,
          `"${ch.name}"`,
          `"${ch.displayName}"`,
          `"${ch.url}"`,
          `"${ch.status}"`,
          ch.isActive,
          `"${ch.streamParam || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    console.log("📊 Datos en formato CSV:");
    console.log(csvContent);

    this.downloadFile(csvContent, "canales.csv", "text/csv");
    return csvContent;
  }

  // Generar array de URLs para iframe
  getIframeUrls() {
    const iframeUrls = this.channels.map((ch) => ch.url);
    console.log("🖼️ URLs para iframe:");
    console.log(JSON.stringify(iframeUrls, null, 2));
    return iframeUrls;
  }

  // Obtener solo canales activos
  getActiveChannels() {
    const activeChannels = this.channels.filter((ch) => ch.isActive);
    console.log("🟢 Solo canales activos:");
    console.log(JSON.stringify(activeChannels, null, 2));
    return activeChannels;
  }

  // Función para descargar archivo
  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log(`💾 Archivo ${filename} descargado`);
  }
}

// Función principal para ejecutar en la consola
function scrapeChannels() {
  const scraper = new ChannelScraper();
  return scraper.scrapeBrowser();
}

// Función para obtener solo los links
function getChannelLinks() {
  const scraper = new ChannelScraper();
  const channels = scraper.scrapeBrowser();
  return channels.map((ch) => ch.url);
}

// Función para obtener solo canales activos
function getActiveChannelLinks() {
  const scraper = new ChannelScraper();
  const channels = scraper.scrapeBrowser();
  return channels.filter((ch) => ch.isActive).map((ch) => ch.url);
}

// Instrucciones de uso
console.log(`
🚀 INSTRUCCIONES DE USO:
========================

1. Ve a https://la14hd.com/
2. Abre la consola del navegador (F12)
3. Copia y pega este script completo
4. Ejecuta uno de estos comandos:

   • scrapeChannels()           - Obtener todos los canales
   • getChannelLinks()          - Solo los links
   • getActiveChannelLinks()    - Solo links de canales activos

5. Para exportar datos:
   • scraper.exportToJSON()     - Descargar JSON
   • scraper.exportToCSV()      - Descargar CSV

Ejemplo:
const scraper = new ChannelScraper();
const channels = scraper.scrapeBrowser();
scraper.exportToJSON();
`);

// Exportar para uso en Node.js si es necesario
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChannelScraper;
}
