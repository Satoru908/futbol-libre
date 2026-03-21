/**
 * Provider para streamtpnew.com
 * 
 * Decodifica el M3U8 URL ofuscado en JavaScript
 * Token válido por 15 horas y funciona con cualquier IP
 */

const axios = require('axios');
const logger = require('../utils/logger');

const STREAMTP_BASE_URL = 'https://streamtpnew.com/global1.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://streamtpnew.com/',
  'Origin': 'https://streamtpnew.com'
};

/**
 * Decodifica el array ofuscado de streamtpnew.com
 * @param {string} html - HTML de la página
 * @returns {string|null} - URL M3U8 decodificada
 */
function decodeStreamtpUrl(html) {
  try {
    // 1. Extraer el array dA
    const daMatch = html.match(/dA=\[(.*?)\];/s);
    if (!daMatch) {
      logger.error('[STREAMTP] No se encontró el array dA');
      return null;
    }

    // 2. Extraer pares [index, base64]
    const pairRegex = /\[(\d+),"([^"]+)"\]/g;
    const pairs = [];
    let match;
    
    while ((match = pairRegex.exec(daMatch[1])) !== null) {
      pairs.push([parseInt(match[1]), match[2]]);
    }

    if (pairs.length === 0) {
      logger.error('[STREAMTP] No se encontraron pares en el array');
      return null;
    }

    // 3. Ordenar por índice
    pairs.sort((a, b) => a[0] - b[0]);

    // 4. Extraer funciones de offset
    const ayabsMatch = html.match(/function ayaBS\(\)\{return (\d+);\}/);
    const vrtodMatch = html.match(/function vRTOd\(\)\{return (\d+);\}/);

    if (!ayabsMatch || !vrtodMatch) {
      logger.error('[STREAMTP] No se encontraron funciones de offset');
      return null;
    }

    const ayabs = parseInt(ayabsMatch[1]);
    const vrtod = parseInt(vrtodMatch[1]);
    const k = ayabs + vrtod;

    logger.info(`[STREAMTP] Offset calculado: ${k} (${ayabs} + ${vrtod})`);

    // 5. Decodificar cada par
    let decodedUrl = '';
    
    for (const [index, b64Value] of pairs) {
      // Decodificar base64
      const decoded = Buffer.from(b64Value, 'base64').toString('utf-8');
      
      // Extraer solo los dígitos
      const digits = decoded.replace(/\D/g, '');
      
      if (digits) {
        // Convertir a número y restar k
        const charCode = parseInt(digits) - k;
        
        // Convertir a carácter
        decodedUrl += String.fromCharCode(charCode);
      }
    }

    logger.info(`[STREAMTP] URL decodificada: ${decodedUrl.substring(0, 80)}...`);
    
    return decodedUrl;

  } catch (error) {
    logger.error(`[STREAMTP] Error decodificando: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene la URL M3U8 de streamtpnew.com
 * @param {string} stream - ID del stream (espn, espn2, etc.)
 * @returns {Promise<string>} - URL M3U8 directa
 */
async function getM3U8Url(stream) {
  try {
    logger.info(`[STREAMTP] Obteniendo M3U8 para stream: ${stream}`);
    
    const url = `${STREAMTP_BASE_URL}?stream=${stream}`;
    
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = response.data;
    
    // Decodificar URL
    const m3u8Url = decodeStreamtpUrl(html);
    
    if (!m3u8Url) {
      throw new Error('No se pudo decodificar la URL M3U8');
    }

    // Verificar que sea una URL válida
    if (!m3u8Url.startsWith('http')) {
      throw new Error('URL decodificada inválida');
    }

    logger.info(`[STREAMTP] ✅ M3U8 obtenido exitosamente`);
    
    return m3u8Url;

  } catch (error) {
    logger.error(`[STREAMTP] Error obteniendo M3U8: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getM3U8Url,
  decodeStreamtpUrl
};
