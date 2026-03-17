// Script simple para extraer logos de canales
// Ejecutar en la consola del navegador en https://la14hd.com/

(function () {
  console.log("🖼️ Extrayendo logos de canales...");

  // Buscar todas las imágenes dentro de .card-image
  const images = document.querySelectorAll(".card-image img");
  const logos = [];

  images.forEach((img, index) => {
    if (img.src && img.src.startsWith("http")) {
      // Obtener el nombre del canal del contenedor padre
      const parent = img.closest("[data-canal]");
      const channelName = parent
        ? parent.getAttribute("data-canal")
        : img.alt || `canal_${index + 1}`;

      logos.push({
        channel: channelName,
        url: img.src,
        alt: img.alt || "",
      });

      console.log(`${index + 1}. ${channelName}: ${img.src}`);
    }
  });

  console.log(`\n📊 Total de logos encontrados: ${logos.length}`);

  // Crear objeto mapeado
  const logoMap = {};
  logos.forEach((logo) => {
    logoMap[logo.channel.toLowerCase()] = logo.url;
  });

  console.log("\n📋 MAPA DE LOGOS:");
  console.log(JSON.stringify(logoMap, null, 2));

  console.log("\n🔗 SOLO URLs:");
  const urls = logos.map((logo) => logo.url);
  console.log(JSON.stringify(urls, null, 2));

  // Guardar en variables globales
  window.channelLogos = logos;
  window.logoUrls = urls;
  window.logoMap = logoMap;

  console.log("\n💡 Variables disponibles:");
  console.log("• window.channelLogos - Datos completos");
  console.log("• window.logoUrls - Solo URLs");
  console.log("• window.logoMap - Mapa canal -> URL");

  return logos;
})();
