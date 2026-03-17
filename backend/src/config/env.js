require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 8787,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
  UPSTREAM_USER_AGENT: process.env.UPSTREAM_USER_AGENT || 'Mozilla/5.0',
  UPSTREAM_REFERER: process.env.UPSTREAM_REFERER || '',
  // Función helper para obtener URL de stream desde variables de entorno
  getStreamUrl: (streamId) => {
    const key = `STREAM_URL_${streamId.toUpperCase()}`;
    return process.env[key];
  }
};
