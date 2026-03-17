// Script para extraer logos de canales de la14hd.com
// Ejecutar en la consola del navegador

(function () {
  console.log("🖼️ Extrayendo logos de canales...");

  // Buscar todas las imágenes dentro de .card-image
  const cardImages = document.querySelectorAll(".card-image img");
  const logos = [];
  const logoMap = {};

  cardImages.forEach((img, index) => {
    const src = img.src;
    const alt = img.alt || img.getAttribute("alt") || "";

    if (src && src.startsWith("http")) {
      // Extraer nombre del canal del alt o del data-canal del contenedor
      let channelName = alt;

      // Buscar el contenedor padre con data-canal
      let parent = img.closest("[data-canal]");
      if (parent) {
        const canalData = parent.getAttribute("data-canal");
        if (canalData) {
          channelName = canalData;
        }
      }

      // Si no hay nombre, intentar extraerlo del src
      if (!channelName) {
        const urlParts = src.split("/");
        const filename = urlParts[urlParts.length - 1];
        channelName = filename.split(".")[0];
      }

      const logoData = {
        channel: channelName,
        alt: alt,
        src: src,
        filename: this.generateFilename(channelName, src),
      };

      logos.push(logoData);
      logoMap[channelName.toLowerCase()] = src;

      console.log(`✅ Logo ${index + 1}: ${channelName} - ${src}`);
    }
  });

  console.log("\n📊 RESUMEN DE LOGOS:");
  console.log("====================");
  console.log(`Total de logos encontrados: ${logos.length}`);

  // Mostrar todos los logos
  console.log("\n🖼️ TODOS LOS LOGOS:");
  logos.forEach((logo, index) => {
    console.log(`${index + 1}. ${logo.channel}: ${logo.src}`);
  });

  // Crear objeto mapeado por canal
  console.log("\n📋 MAPA DE LOGOS (JSON):");
  console.log(JSON.stringify(logoMap, null, 2));

  // Crear array de URLs para descarga
  const logoUrls = logos.map((logo) => logo.src);
  console.log("\n🔗 ARRAY DE URLs:");
  console.log(JSON.stringify(logoUrls, null, 2));

  // Crear script de descarga
  console.log("\n💾 SCRIPT DE DESCARGA:");
  const downloadScript = this.generateDownloadScript(logos);
  console.log(downloadScript);

  // Crear datos para actualizar channels.json
  console.log("\n🔄 DATOS PARA CHANNELS.JSON:");
  const channelLogos = this.generateChannelLogosData(logos);
  console.log(JSON.stringify(channelLogos, null, 2));

  // Guardar en variables globales
  window.extractedLogos = logos;
  window.logoMap = logoMap;
  window.logoUrls = logoUrls;

  console.log("\n💡 Variables disponibles:");
  console.log("• window.extractedLogos - Datos completos de logos");
  console.log("• window.logoMap - Mapa canal -> URL");
  console.log("• window.logoUrls - Array de URLs");

  // Función para descargar como JSON
  window.downloadLogosJSON = function () {
    const dataStr = JSON.stringify(logos, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "channel-logos.json";
    link.click();
    URL.revokeObjectURL(url);
    console.log("📁 Archivo channel-logos.json descargado");
  };

  // Función para descargar script de descarga
  window.downloadLogosScript = function () {
    const script = generateDownloadScript(logos);
    const dataBlob = new Blob([script], { type: "text/javascript" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "download-logos.js";
    link.click();
    URL.revokeObjectURL(url);
    console.log("📁 Archivo download-logos.js descargado");
  };

  console.log("\n🎯 COMANDOS ÚTILES:");
  console.log("• downloadLogosJSON() - Descargar datos como JSON");
  console.log("• downloadLogosScript() - Descargar script de descarga");

  return logos;

  // Función para generar nombre de archivo
  function generateFilename(channelName, src) {
    const extension = src.split(".").pop().split("?")[0];
    const cleanName = channelName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    return `${cleanName}.${extension}`;
  }

  // Función para generar script de descarga
  function generateDownloadScript(logos) {
    let script = `// Script para descargar logos de canales
// Ejecutar en Node.js con: node download-logos.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const logos = ${JSON.stringify(logos, null, 2)};

// Crear directorio si no existe
const logoDir = './assets/logos';
if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
}

// Función para descargar imagen
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(logoDir, filename);
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(\`✅ Descargado: \${filename}\`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // Eliminar archivo parcial
            console.error(\`❌ Error descargando \${filename}:\`, err.message);
            reject(err);
        });
    });
}

// Descargar todos los logos
async function downloadAllLogos() {
    console.log(\`🚀 Iniciando descarga de \${logos.length} logos...\`);
    
    for (let i = 0; i < logos.length; i++) {
        const logo = logos[i];
        try {
            await downloadImage(logo.src, logo.filename);
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre descargas
        } catch (error) {
            console.error(\`Error con \${logo.channel}:\`, error.message);
        }
    }
    
    console.log('🎉 Descarga completada!');
}

downloadAllLogos();`;

    return script;
  }

  // Función para generar datos de logos para channels.json
  function generateChannelLogosData(logos) {
    const channelLogos = {};
    logos.forEach((logo) => {
      const channelKey = logo.channel.toLowerCase();
      channelLogos[channelKey] = {
        name: logo.channel,
        logo: logo.src,
        localLogo: `assets/logos/${logo.filename}`,
      };
    });
    return channelLogos;
  }
}).bind({
  generateFilename: function (channelName, src) {
    const extension = src.split(".").pop().split("?")[0];
    const cleanName = channelName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    return `${cleanName}.${extension}`;
  },

  generateDownloadScript: function (logos) {
    return `// Script para descargar logos de canales
// Ejecutar en Node.js con: node download-logos.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const logos = ${JSON.stringify(logos, null, 2)};

// Crear directorio si no existe
const logoDir = './assets/logos';
if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
}

// Función para descargar imagen
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(logoDir, filename);
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(\`✅ Descargado: \${filename}\`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // Eliminar archivo parcial
            console.error(\`❌ Error descargando \${filename}:\`, err.message);
            reject(err);
        });
    });
}

// Descargar todos los logos
async function downloadAllLogos() {
    console.log(\`🚀 Iniciando descarga de \${logos.length} logos...\`);
    
    for (let i = 0; i < logos.length; i++) {
        const logo = logos[i];
        try {
            await downloadImage(logo.src, logo.filename);
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre descargas
        } catch (error) {
            console.error(\`Error con \${logo.channel}:\`, error.message);
        }
    }
    
    console.log('🎉 Descarga completada!');
}

downloadAllLogos();`;
  },

  generateChannelLogosData: function (logos) {
    const channelLogos = {};
    logos.forEach((logo) => {
      const channelKey = logo.channel.toLowerCase();
      channelLogos[channelKey] = {
        name: logo.channel,
        logo: logo.src,
        localLogo: `assets/logos/${this.generateFilename(
          logo.channel,
          logo.src
        )}`,
      };
    });
    return channelLogos;
  },
})();
