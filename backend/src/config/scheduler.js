const cron = require('node-cron');
const { scrapeAgenda } = require('../scrapers/agenda.scraper');
const logger = require('../utils/logger');

/**
 * Inicializa todas las tareas programadas
 */
function initScheduledTasks() {
  // Actualizar agenda cada 30 minutos
  cron.schedule('*/30 * * * *', () => {
    logger.info('Ejecutando scraping de agenda programado');
    scrapeAgenda();
  });

  // Ejecutar scraping inicial después de 5 segundos
  setTimeout(() => {
    logger.info('Ejecutando scraping inicial de agenda');
    scrapeAgenda();
  }, 5000);
}

module.exports = { initScheduledTasks };
