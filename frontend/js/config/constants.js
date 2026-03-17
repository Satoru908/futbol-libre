/**
 * Constantes de la aplicación
 * 
 * Sistema automático de detección de URL del backend:
 * - Si frontend en localhost → intenta 8787 local, fallback a Railway
 * - Si frontend en host real → usa Railway
 * 
 * Configuración actual:
 * - Railway Backend: https://futbol-libre-production-5102.up.railway.app/api
 * - Local Backend: http://localhost:8787/api (opcional)
 */

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  const RAILWAY_URL = 'https://futbol-libre-production-5102.up.railway.app/api';
  const LOCAL_URL = 'http://localhost:8787/api';
  
  // Si estamos en localhost, preferir local si está disponible
  // Si no, fallback automático a Railway
  if (isLocalhost) {
    // Para testing: usar Railway en lugar de backend local
    return RAILWAY_URL;
    
    // Código para backend local (descomentar si tienes backend en :8787):
    // return LOCAL_URL;
  }
  
  // En producción o hosts distintos a localhost, usar Railway
  return RAILWAY_URL;
};

export const APP_CONFIG = {
  channelsDataUrl: 'data/channels-complete.json',
  agendaDataUrl: 'data/agenda.json',
  defaultLogo: 'assets/logos/default.png',
  apiBaseUrl: getApiBaseUrl()
};

export const CATEGORY_ORDER = [
  'LATINOAMERICA',
  'ARGENTINA',
  'PERÚ',
  'COLOMBIA',
  'MÉXICO',
  'USA',
  'CHILE',
  'BRASIL',
  'PORTUGAL',
  'ESPAÑA',
  'MUNDO',
  'OTROS'
];

export const CHANNEL_LABELS = {
  liga1max: 'L1MAX',
  dsports: 'DIRECTV Sports',
  golperu: 'GOLPERÚ'
};
