const logger = require('../utils/logger');

/**
 * Middleware global para manejo de errores
 */
function errorHandler(err, req, res, next) {
  logger.error('Error en request:', err.message);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
