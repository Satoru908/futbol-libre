const logger = require('../utils/logger');

/**
 * Middleware para logging de requests
 */
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = logger.sanitize(req.url);
  
  logger.info(`${timestamp} ${method} ${url}`);
  next();
}

module.exports = requestLogger;
