const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const urlValidator = require('../utils/url-validator');

/**
 * Descarga y procesa la agenda de eventos
 */
async function scrapeAgenda() {
  try {
    logger.info('Iniciando descarga de agenda JSON');
    
    const url = 'https://la14hd.com/eventos/json/agenda123.json';
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://la14hd.com/eventos/'
      },
      timeout: 10000 
    });

    if (!Array.isArray(data)) {
      throw new Error('Formato JSON inesperado: no es un array');
    }

    const events = data
      .map((item, index) => parseEvent(item, index))
      .filter(ev => ev !== null && ev.title && ev.streamId); // Filtrar null y sin datos

    saveAgenda(events);

  } catch (error) {
    logger.error('Error actualizando agenda:', error.message);
  }
}

/**
 * Parsea un evento del JSON
 */
function parseEvent(item, index) {
  const streamId = urlValidator.extractStreamParam(item.link) || '';
  const title = item.title ? item.title.replace(/\n/g, '').trim() : 'Evento desconocido';
  
  // Determinar estado del evento - mejorar detección
  const status = item.status ? item.status.toLowerCase().trim() : '';
  
  // Detectar si está finalizado (múltiples variantes)
  const isFinished = status.includes('finalizado') || 
                     status.includes('finished') || 
                     status.includes('fin') ||
                     status.includes('terminado') ||
                     status.includes('ended') ||
                     status === 'ft' || // Full Time
                     status.includes('final');
  
  // Obtener hora del evento
  const eventTime = item.time || '00:00';
  const eventTimeInfo = getEventTimeInfo(eventTime);
  
  // IMPORTANTE: Priorizar la hora sobre el status
  // Si el evento es futuro (no ha empezado), es PRONTO sin importar el status
  if (eventTimeInfo.isUpcoming && !isFinished) {
    logger.debug(`Evento ${eventTime} marcado como PRONTO (futuro)`);
    return {
      id: index + 1,
      time: eventTime,
      title,
      category: item.category || 'Deportes',
      status: 'Pronto',
      isLive: false,
      isFinished: false,
      isUpcoming: true,
      url: streamId ? `canal.html?stream=${streamId}` : '#',
      streamId
    };
  }
  
  // Si pasaron más de 3 horas, está finalizado
  if (eventTimeInfo.isTooOld || isFinished) {
    logger.debug(`Evento ${eventTime} marcado como FINALIZADO`);
    return null; // Retornar null para filtrar
  }
  
  // Si ya empezó y no ha pasado mucho tiempo, está EN VIVO
  if (eventTimeInfo.hasStarted) {
    logger.debug(`Evento ${eventTime} marcado como EN VIVO`);
    return {
      id: index + 1,
      time: eventTime,
      title,
      category: item.category || 'Deportes',
      status: 'En vivo',
      isLive: true,
      isFinished: false,
      isUpcoming: false,
      url: streamId ? `canal.html?stream=${streamId}` : '#',
      streamId
    };
  }
  
  // Por defecto, PRONTO
  logger.debug(`Evento ${eventTime} marcado como PRONTO (default)`);
  return {
    id: index + 1,
    time: eventTime,
    title,
    category: item.category || 'Deportes',
    status: 'Pronto',
    isLive: false,
    isFinished: false,
    isUpcoming: true,
    url: streamId ? `canal.html?stream=${streamId}` : '#',
    streamId
  };
}

/**
 * Obtiene información sobre el tiempo del evento
 */
function getEventTimeInfo(eventTime) {
  try {
    const [hours, minutes] = eventTime.split(':').map(Number);
    const now = new Date();
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);
    
    // Calcular diferencia en minutos
    const diffMs = now - eventDate;
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMinutes / 60;
    
    // Log para debug
    logger.debug(`Evento ${eventTime}: diffMinutes=${diffMinutes.toFixed(0)}, diffHours=${diffHours.toFixed(1)}`);
    
    return {
      hasStarted: diffMinutes >= 0, // Ya empezó (hora actual >= hora evento)
      isTooOld: diffHours > 3, // Pasaron más de 3 horas
      isUpcoming: diffMinutes < 0 && diffHours > -6 // Falta tiempo pero menos de 6 horas en el futuro
    };
  } catch (e) {
    return {
      hasStarted: false,
      isTooOld: false,
      isUpcoming: true
    };
  }
}

/**
 * Guarda la agenda en archivo JSON
 */
function saveAgenda(events) {
  const outputPath = path.join(__dirname, '../../../frontend/data/agenda.json');
  const dir = path.dirname(outputPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (events.length > 0) {
    fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
    logger.info(`Agenda actualizada con ${events.length} eventos`);
  } else {
    logger.warn('No se encontraron eventos válidos');
  }
}

// Permitir ejecución directa
if (require.main === module) {
  scrapeAgenda();
}

module.exports = { scrapeAgenda };
