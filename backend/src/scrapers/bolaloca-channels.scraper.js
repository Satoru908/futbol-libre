/**
 * Scraper de canales desde bolaloca.my
 * Genera canales del 1 al 200 basados en la lista proporcionada
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Mapeo de canales de bolaloca.my
const BOLALOCA_CHANNELS = {
  1: { name: 'beIN SPORT 1', category: 'beIN Sports', country: 'FR' },
  2: { name: 'beIN SPORT 2', category: 'beIN Sports', country: 'FR' },
  3: { name: 'beIN SPORT 3', category: 'beIN Sports', country: 'FR' },
  4: { name: 'beIN SPORT max 4', category: 'beIN Sports', country: 'FR' },
  5: { name: 'beIN SPORT max 5', category: 'beIN Sports', country: 'FR' },
  6: { name: 'beIN SPORT max 6', category: 'beIN Sports', country: 'FR' },
  7: { name: 'beIN SPORT max 7', category: 'beIN Sports', country: 'FR' },
  8: { name: 'beIN SPORT max 8', category: 'beIN Sports', country: 'FR' },
  9: { name: 'beIN SPORT max 9', category: 'beIN Sports', country: 'FR' },
  10: { name: 'beIN SPORT max 10', category: 'beIN Sports', country: 'FR' },
  11: { name: 'canal+', category: 'Canal+', country: 'FR' },
  12: { name: 'canal+ foot', category: 'Canal+', country: 'FR' },
  13: { name: 'canal+ sport', category: 'Canal+', country: 'FR' },
  14: { name: 'canal+ sport360', category: 'Canal+', country: 'FR' },
  15: { name: 'eurosport1', category: 'Eurosport', country: 'FR' },
  16: { name: 'eurosport2', category: 'Eurosport', country: 'FR' },
  17: { name: 'rmc sport1', category: 'RMC Sport', country: 'FR' },
  18: { name: 'LIGUE 1 FR 6', category: 'Ligue 1', country: 'FR' },
  19: { name: 'equipe', category: 'Francia', country: 'FR' },
  20: { name: 'LIGUE 1 FR 1', category: 'Ligue 1', country: 'FR' },
  21: { name: 'LIGUE 1 FR 4', category: 'Ligue 1', country: 'FR' },
  22: { name: 'LIGUE 1 FR 5', category: 'Ligue 1', country: 'FR' },
  23: { name: 'automoto', category: 'Francia', country: 'FR' },
  24: { name: 'tf1', category: 'Francia', country: 'FR' },
  25: { name: 'tmc', category: 'Francia', country: 'FR' },
  26: { name: 'm6', category: 'Francia', country: 'FR' },
  27: { name: 'w9', category: 'Francia', country: 'FR' },
  28: { name: 'france2', category: 'Francia', country: 'FR' },
  29: { name: 'france3', category: 'Francia', country: 'FR' },
  30: { name: 'france4', category: 'Francia', country: 'FR' },
  68: { name: 'TUDN USA', category: 'USA', country: 'US' },
  69: { name: 'beIN En español', category: 'beIN Sports', country: 'US' },
  70: { name: 'FOX Deportes', category: 'Fox Sports', country: 'US' },
  71: { name: 'ESPN Deportes', category: 'ESPN', country: 'US' },
  72: { name: 'NBC UNIVERSO', category: 'USA', country: 'US' },
  73: { name: 'Telemundo', category: 'USA', country: 'US' },
  74: { name: 'LAS latin america sports', category: 'Deportes', country: 'LATAM' },
  75: { name: 'TNT sport arg', category: 'TNT Sports', country: 'AR' },
  76: { name: 'ESPN Premium', category: 'ESPN', country: 'AR' },
  77: { name: 'TyC Sports', category: 'TyC Sports', country: 'AR' },
  78: { name: 'FOXsport1 arg', category: 'Fox Sports', country: 'AR' },
  79: { name: 'FOXsport2 arg', category: 'Fox Sports', country: 'AR' },
  80: { name: 'FOXsport3 arg', category: 'Fox Sports', country: 'AR' },
  81: { name: 'WINsport+', category: 'Win Sports', country: 'CO' },
  82: { name: 'WINsport', category: 'Win Sports', country: 'CO' },
  83: { name: 'TNTCHILE Premium', category: 'TNT Sports', country: 'CL' },
  84: { name: 'Liga1MAX', category: 'Deportes', country: 'PE' },
  85: { name: 'GOLPERU', category: 'Deportes', country: 'PE' },
  86: { name: 'Zapping sports', category: 'Deportes', country: 'LATAM' },
  87: { name: 'ESPN1', category: 'ESPN', country: 'LATAM' },
  88: { name: 'ESPN2', category: 'ESPN', country: 'LATAM' },
  89: { name: 'ESPN3', category: 'ESPN', country: 'LATAM' },
  90: { name: 'ESPN4', category: 'ESPN', country: 'LATAM' },
  91: { name: 'ESPN5', category: 'ESPN', country: 'LATAM' },
  92: { name: 'ESPN6', category: 'ESPN', country: 'LATAM' },
  93: { name: 'ESPN7', category: 'ESPN', country: 'LATAM' },
  94: { name: 'directv', category: 'DSports', country: 'LATAM' },
  95: { name: 'directv2', category: 'DSports', country: 'LATAM' },
  96: { name: 'directv+', category: 'DSports', country: 'LATAM' },
  97: { name: 'ESPN1MX', category: 'ESPN', country: 'MX' },
  98: { name: 'ESPN2MX', category: 'ESPN', country: 'MX' },
  99: { name: 'ESPN3MX', category: 'ESPN', country: 'MX' },
  100: { name: 'ESPN4MX', category: 'ESPN', country: 'MX' },
  101: { name: 'FOXsport1MX', category: 'Fox Sports', country: 'MX' },
  102: { name: 'FOXsport2MX', category: 'Fox Sports', country: 'MX' },
  103: { name: 'FOXsport3MX', category: 'Fox Sports', country: 'MX' },
  104: { name: 'FOX SPORTS PREMIUM', category: 'Fox Sports', country: 'MX' },
  105: { name: 'AYM', category: 'Deportes', country: 'MX' },
  106: { name: 'TUDNMX', category: 'Deportes', country: 'MX' },
  107: { name: 'CANAL5', category: 'Deportes', country: 'MX' },
  108: { name: 'Azteca 7', category: 'Deportes', country: 'MX' },
  109: { name: 'VTV plus', category: 'Deportes', country: 'UY' },
  155: { name: 'dazn baloncesto 1', category: 'DAZN', country: 'ES' },
  156: { name: 'dazn baloncesto 2', category: 'DAZN', country: 'ES' },
  157: { name: 'dazn baloncesto 3', category: 'DAZN', country: 'ES' }
};

/**
 * Genera la lista completa de canales de bolaloca.my
 */
function generateChannels() {
  try {
    logger.info('[BOLALOCA SCRAPER] Generando lista de canales');
    
    const channels = [];
    
    // Generar canales del 1 al 200
    for (let i = 1; i <= 200; i++) {
      const channelInfo = BOLALOCA_CHANNELS[i];
      
      if (channelInfo) {
        // Canal con información conocida
        channels.push({
          id: `bolaloca_${i}`,
          channelNumber: i,
          name: channelInfo.name,
          logo: `https://via.placeholder.com/150?text=${encodeURIComponent(channelInfo.name)}`,
          category: channelInfo.category,
          country: channelInfo.country,
          provider: 'bolaloca',
          iframeUrl: `https://bolaloca.my/player/capo/${i}`
        });
      } else {
        // Canal sin información (CH31-CH200 extras)
        channels.push({
          id: `bolaloca_${i}`,
          channelNumber: i,
          name: `Canal ${i}`,
          logo: `https://via.placeholder.com/150?text=CH${i}`,
          category: 'Deportes',
          country: 'Internacional',
          provider: 'bolaloca',
          iframeUrl: `https://bolaloca.my/player/capo/${i}`
        });
      }
    }

    logger.info(`[BOLALOCA SCRAPER] Generados ${channels.length} canales`);
    
    return channels;
    
  } catch (error) {
    logger.error(`[BOLALOCA SCRAPER] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Guarda los canales en archivo JSON
 */
function saveChannels() {
  try {
    const channels = generateChannels();
    
    // Guardar en backend/data
    const outputPath = path.join(__dirname, '../../data/channels-complete.json');
    const data = { 
      channels,
      provider: 'bolaloca.my',
      totalChannels: channels.length,
      lastUpdate: new Date().toISOString()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    
    logger.info(`[BOLALOCA SCRAPER] ✅ Canales guardados en ${outputPath}`);
    
    // También guardar en frontend
    try {
      const frontendPath = path.join(__dirname, '../../../frontend/data/channels-complete.json');
      fs.writeFileSync(frontendPath, JSON.stringify(data, null, 2), 'utf-8');
      logger.info(`[BOLALOCA SCRAPER] ✅ Canales también guardados en frontend`);
    } catch (err) {
      logger.warn(`[BOLALOCA SCRAPER] No se pudo guardar en frontend: ${err.message}`);
    }
    
    return channels;
  } catch (error) {
    logger.error(`[BOLALOCA SCRAPER] Error en saveChannels: ${error.message}`);
    return null;
  }
}

module.exports = {
  generateChannels,
  saveChannels
};
