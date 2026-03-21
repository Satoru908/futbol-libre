/**
 * Provider para streamtpnew.com
 * 
 * Decodifica el M3U8 URL ofuscado en JavaScript
 * Token válido por 15 horas y funciona con cualquier IP
 */

const axios = require('axios');
const logger = require('../utils/logger');

const STREAMTP_BASE_URL = 'https://streamtp10.com/global1.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://streamtp10.com/',
  'Origin': 'https://streamtp10.com'
};

/**
 * Decodifica el array ofuscado de streamtpnew.com
 * @param {string} html - HTML de la página
 * @returns {string|null} - URL M3U8 decodificada
 */
function decodeStreamtpUrl(html) {
  try {
    // 1. Extraer el array (nombre de variable dinámico: dA, AZ, zl, etc.)
    // Buscar patrón: var playbackURL="",VARIABLE=[...]
    const arrayMatch = html.match(/var playbackURL="",(\w+)=\[(.*?)\];/s);
    
    if (!arrayMatch) {
      logger.error('[STREAMTP] No se encontró el array de datos');
      return null;
    }
    
    const arrayName = arrayMatch[1];
    const arrayContent = arrayMatch[2];
    logger.info(`[STREAMTP] Array encontrado: ${arrayName}`);

    // 2. Extraer pares [index, base64]
    const pairRegex = /\[(\d+),"([^"]+)"\]/g;
    const pairs = [];
    let match;
    
    while ((match = pairRegex.exec(arrayContent)) !== null) {
      pairs.push([parseInt(match[1]), match[2]]);
    }

    if (pairs.length === 0) {
      logger.error('[STREAMTP] No se encontraron pares en el array');
      return null;
    }

    // 3. Ordenar por índice
    pairs.sort((a, b) => a[0] - b[0]);

    // 4. Extraer funciones de offset (buscar cualquier patrón)
    const functionMatches = html.match(/function (\w+)\(\)\{return (\d+);\}/g);
    
    if (!functionMatches || functionMatches.length < 2) {
      logger.error('[STREAMTP] No se encontraron funciones de offset');
      return null;
    }

    // Extraer los valores numéricos de las funciones
    const offsets = [];
    for (const funcMatch of functionMatches) {
      const valueMatch = funcMatch.match(/return (\d+);/);
      if (valueMatch) {
        offsets.push(parseInt(valueMatch[1]));
      }
    }

    if (offsets.length < 2) {
      logger.error('[STREAMTP] No se pudieron extraer los offsets');
      return null;
    }

    const k = offsets[0] + offsets[1];
    logger.info(`[STREAMTP] Offset calculado: ${k} (${offsets[0]} + ${offsets[1]})`);

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
    logger.info(`[STREAMTP] URL completa: ${url}`);
    
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000
    });

    if (response.status !== 200) {
      logger.error(`[STREAMTP] HTTP error: ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = response.data;
    logger.info(`[STREAMTP] HTML recibido: ${html.length} bytes`);
    
    // Verificar que sea el HTML del player, no la página de índice
    if (html.includes('<title>24/7 Channels')) {
      logger.error(`[STREAMTP] Error: Se obtuvo la página de índice en lugar del player`);
      throw new Error('URL incorrecta - se obtuvo página de índice');
    }
    
    // Decodificar URL
    const m3u8Url = decodeStreamtpUrl(html);
    
    if (!m3u8Url) {
      logger.error(`[STREAMTP] No se pudo decodificar la URL M3U8`);
      throw new Error('No se pudo decodificar la URL M3U8');
    }

    // Verificar que sea una URL válida
    if (!m3u8Url.startsWith('http')) {
      logger.error(`[STREAMTP] URL decodificada inválida: ${m3u8Url}`);
      throw new Error('URL decodificada inválida');
    }

    // Remover el parámetro &ip= porque el token valida la IP del cliente
    // El usuario debe acceder con su propia IP, no la de Railway
    const cleanUrl = m3u8Url.replace(/&ip=[^&]+/, '');

    logger.info(`[STREAMTP] ✅ M3U8 obtenido exitosamente: ${cleanUrl.substring(0, 80)}...`);
    
    return cleanUrl;

  } catch (error) {
    logger.error(`[STREAMTP] Error obteniendo M3U8: ${error.message}`);
    logger.error(`[STREAMTP] Stack: ${error.stack}`);
    throw error;
  }
}

module.exports = {
  getM3U8Url,
  decodeStreamtpUrl
};
