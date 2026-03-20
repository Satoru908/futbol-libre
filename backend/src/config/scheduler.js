const cron = require('node-cron');
const { scrapeAgenda } = require('../scrapers/agenda.scraper');
const logger = require('../utils/logger');
const axios = require('axios');

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

  // Keep-alive para Hugging Face Space
  // Evita que el Space se duerma después de 48 horas sin uso
  if (process.env.HF_PROXY_URL) {
    setInterval(async () => {
      try {
        const response = await axios.get(process.env.HF_PROXY_URL, {
          timeout: 30000
        });
        
        if (response.status === 200) {
          logger.info('[HF KEEP-ALIVE] Ping successful');
        } else {
          logger.warn(`[HF KEEP-ALIVE] Unexpected status: ${response.status}`);
        }
      } catch (error) {
        logger.error(`[HF KEEP-ALIVE] Error: ${error.message}`);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    logger.info('[HF KEEP-ALIVE] Scheduler started (ping every 5 minutes)');
  }

  // Keep-alive para Render
  // Evita que Render duerma el servicio gratuito después de 15 minutos sin uso
  if (process.env.RENDER_PROXY_URL) {
    setInterval(async () => {
      try {
        const response = await axios.get(process.env.RENDER_PROXY_URL, {
          timeout: 30000
        });
        
        if (response.status === 200) {
          logger.info('[RENDER KEEP-ALIVE] Ping successful');
        } else {
          logger.warn(`[RENDER KEEP-ALIVE] Unexpected status: ${response.status}`);
        }
      } catch (error) {
        logger.error(`[RENDER KEEP-ALIVE] Error: ${error.message}`);
      }
    }, 10 * 60 * 1000); // Cada 10 minutos
    
    logger.info('[RENDER KEEP-ALIVE] Scheduler started (ping every 10 minutes)');
  }
}

module.exports = { initScheduledTasks };
