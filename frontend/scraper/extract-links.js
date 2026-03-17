// Script simple para extraer links de canales
// Ejecutar en la consola del navegador en https://la14hd.com/

(function () {
  console.log("🔍 Extrayendo links de canales...");

  // Buscar todos los elementos con data-canal
  const channelElements = document.querySelectorAll("[data-canal]");
  const results = [];

  channelElements.forEach((element, index) => {
    // Extraer información básica
    const canalName = element.getAttribute("data-canal");
    const linkElement = element.querySelector('a[href*="canales.php"]');
    const statusElement = element.querySelector(".status-text");

    if (linkElement) {
      const isActive = statusElement
        ? !statusElement.classList.contains("text-offline")
        : false;
      const status = isActive ? "🟢 ACTIVO" : "🔴 INACTIVO";

      results.push({
        canal: canalName,
        url: linkElement.href,
        status: status,
        isActive: isActive,
      });

      console.log(`${status} - ${canalName}: ${linkElement.href}`);
    }
  });

  console.log("\n📊 RESUMEN:");
  console.log(`Total canales encontrados: ${results.length}`);
  console.log(`Canales activos: ${results.filter((r) => r.isActive).length}`);
  console.log(
    `Canales inactivos: ${results.filter((r) => !r.isActive).length}`
  );

  // Crear arrays separados
  const allLinks = results.map((r) => r.url);
  const activeLinks = results.filter((r) => r.isActive).map((r) => r.url);
  const inactiveLinks = results.filter((r) => !r.isActive).map((r) => r.url);

  console.log("\n📋 TODOS LOS LINKS:");
  console.log(JSON.stringify(allLinks, null, 2));

  console.log("\n🟢 SOLO LINKS ACTIVOS:");
  console.log(JSON.stringify(activeLinks, null, 2));

  // Guardar en variables globales para fácil acceso
  window.channelData = results;
  window.allChannelLinks = allLinks;
  window.activeChannelLinks = activeLinks;
  window.inactiveChannelLinks = inactiveLinks;

  console.log("\n💡 Variables disponibles:");
  console.log("• window.channelData - Datos completos");
  console.log("• window.allChannelLinks - Todos los links");
  console.log("• window.activeChannelLinks - Solo links activos");
  console.log("• window.inactiveChannelLinks - Solo links inactivos");

  return results;
})();
