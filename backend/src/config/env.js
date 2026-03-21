require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 8787,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
  
  // Provider Configuration (streamtp10.com)
  PROVIDER_BASE_URL: process.env.PROVIDER_BASE_URL || 'https://streamtp10.com/global1.php',
  PROVIDER_USER_AGENT: process.env.PROVIDER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  PROVIDER_REFERER: process.env.PROVIDER_REFERER || 'https://streamtp10.com/',
  
  // Cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '60000', 10), // ms
  
  // Cloudflare Worker URL para proxy de video (opcional)
  CLOUDFLARE_WORKER_URL: process.env.CLOUDFLARE_WORKER_URL || '',
  
  // Función helper para obtener URL de stream desde variables de entorno
  getStreamUrl: (streamId) => {
    const key = `STREAM_URL_${streamId.toUpperCase()}`;
    return process.env[key];
  }
};
