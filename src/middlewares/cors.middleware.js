const cors = require('cors');
const env = require('../config/env');

/**
 * Configuración de CORS
 */
function configureCors() {
  const allowedOrigins = env.ALLOWED_ORIGINS === '*' 
    ? '*' 
    : env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

  return cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: false
  });
}

module.exports = configureCors;
