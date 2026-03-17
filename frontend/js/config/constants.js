/**
 * Constantes de la aplicación
 * Detecta automáticamente si está en desarrollo o producción
 */

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  
  // Producción: usar el mismo origen (Railway)
  return `${protocol}//${hostname}`;
};

const getSiteUrl = () => {
  return window.location.origin;
};

const getAnalyticsId = () => {
  return '';
};

export const APP_CONFIG = {
  apiBaseUrl: getApiBaseUrl(),
  channelsDataUrl: `${getApiBaseUrl()}/data/channels-complete.json`,
  agendaUrl: `${getApiBaseUrl()}/api/agenda`,
  siteUrl: getSiteUrl(),
  gaId: getAnalyticsId()
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
