const cron = require('node-cron');
const { scrapeAgenda } = require('../scrapers/agenda.scraper');
const { scrapeAndSave: scrapeChannels } = require('../scrapers/channels.scraper');
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

  // Ejecutar scraping inicial de agenda después de 5 segundos
  setTimeout(() => {
    logger.info('Ejecutando scraping inicial de agenda');
    scrapeAgenda();
  }, 5000);

  // Actualizar canales cada 6 horas
  cron.schedule('0 */6 * * *', () => {
    logger.info('Ejecutando scraping de canales programado');
    scrapeChannels();
  });

  // Ejecutar scraping inicial de canales después de 10 segundos
  setTimeout(() => {
    logger.info('Ejecutando scraping inicial de canales');
    scrapeChannels();
  }, 10000);
}

module.exports = { initScheduledTasks };
