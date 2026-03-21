/**
 * Scraper de canales desde streamtpnew.com
 * Extrae todos los canales disponibles y los guarda en channels-complete.json
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Extrae todos los canales de streamtpnew.com
 */
async function scrapeChannels() {
  try {
    logger.info('[CHANNELS SCRAPER] Iniciando scraping de canales');
    
    const url = 'https://streamtpnew.com';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = response.data;
    
    // Buscar el objeto JavaScript con los canales
    const channelsMatch = html.match(/const channels = \{(.*?)\};/s);
    
    if (!channelsMatch) {
      throw new Error('No se encontró el objeto channels en el HTML');
    }

    // Extraer pares nombre: url
    const channelPattern = /'([^']+)':\s*'([^']+)'/g;
    const matches = [...channelsMatch[1].matchAll(channelPattern)];
    
    const channels = [];
    
    for (const match of matches) {
      const name = match[1];
      const url = match[2];
      
      // Extraer el stream ID de la URL
      const streamMatch = url.match(/stream=([^&]+)/);
      if (streamMatch) {
        const streamId = streamMatch[1];
        
        // Determinar categoría basada en el nombre
        let category = 'Deportes';
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('espn')) {
          category = 'ESPN';
        } else if (nameLower.includes('fox')) {
          category = 'Fox Sports';
        } else if (nameLower.includes('win')) {
          category = 'Win Sports';
        } else if (nameLower.includes('dsports') || nameLower.includes('directv')) {
          category = 'DSports';
        } else if (nameLower.includes('tnt')) {
          category = 'TNT Sports';
        } else if (nameLower.includes('tyc')) {
          category = 'TyC Sports';
        } else if (nameLower.includes('usa') || nameLower.includes('tudn') || nameLower.includes('universo')) {
          category = 'USA';
        } else if (nameLower.includes('mx') || nameLower.includes('azteca')) {
          category = 'México';
        } else if (nameLower.includes('br') || nameLower.includes('premiere') || nameLower.includes('sporttv')) {
          category = 'Brasil';
        }
        
        channels.push({
          id: streamId,
          name: name,
          logo: `https://via.placeholder.com/150?text=${encodeURIComponent(name)}`,
          category: category,
          provider: 'streamtp10'
        });
      }
    }

    logger.info(`[CHANNELS SCRAPER] Encontrados ${channels.length} canales`);
    
    // Guardar en archivo JSON
    const outputPath = path.join(__dirname, '../../data/channels-complete.json');
    const data = { channels };
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    
    logger.info(`[CHANNELS SCRAPER] ✅ Canales guardados en ${outputPath}`);
    
    return channels;
    
  } catch (error) {
    logger.error(`[CHANNELS SCRAPER] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Scraper con manejo de errores y guardado
 */
async function scrapeAndSave() {
  try {
    const channels = await scrapeChannels();
    
    // También guardar en frontend
    const frontendPath = path.join(__dirname, '../../../frontend/data/channels-complete.json');
    const data = { channels };
    
    fs.writeFileSync(frontendPath, JSON.stringify(data, null, 2), 'utf-8');
    
    logger.info(`[CHANNELS SCRAPER] ✅ Canales también guardados en frontend`);
    
    return channels;
  } catch (error) {
    logger.error(`[CHANNELS SCRAPER] Error en scrapeAndSave: ${error.message}`);
    // No lanzar error para que no rompa el servidor
    return null;
  }
}

module.exports = {
  scrapeChannels,
  scrapeAndSave
};
