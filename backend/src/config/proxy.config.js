/**
 * Configuración de Proxies CORS
 * 
 * IMPORTANTE: Después de deployar tu proxy en Vercel, actualiza VERCEL_PROXY_URL
 * con la URL que te dio Vercel.
 * 
 * Ejemplo: https://futbol-libre-proxy-abc123.vercel.app
 */

// ⬇️ ACTUALIZA ESTA URL DESPUÉS DE DEPLOYAR EN VERCEL ⬇️
const VERCEL_PROXY_URL = process.env.VERCEL_PROXY_URL || '';

/**
 * Lista de proxies CORS en orden de prioridad
 * 
 * El sistema rotará entre estos proxies para distribuir la carga.
 * Si el primero falla, usará el siguiente automáticamente.
 */
const CORS_PROXIES = VERCEL_PROXY_URL 
  ? [
      `${VERCEL_PROXY_URL}/api/proxy?url=`,  // Tu proxy propio (sin límites)
      'https://api.allorigins.win/raw?url=',  // Backup 1
      'https://corsproxy.io/?',  // Backup 2
    ]
  : [
      // Si no hay proxy de Vercel, usar solo los públicos
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];

module.exports = {
  CORS_PROXIES,
  VERCEL_PROXY_URL
};
