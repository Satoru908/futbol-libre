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

/**
 * Detecta si la aplicación se está ejecutando como Telegram Mini App
 */
const isTelegramMiniApp = () => {
  // Verificar si se ejecuta dentro del iframe de Telegram
  try {
    return window.Telegram !== undefined && window.Telegram.WebApp !== undefined;
  } catch (e) {
    return false;
  }
};

export const APP_CONFIG = {
  apiBaseUrl: getApiBaseUrl(),
  channelsDataUrl: `${getApiBaseUrl()}/data/channels-complete.json`,
  agendaUrl: `${getApiBaseUrl()}/api/agenda`,
  siteUrl: getSiteUrl(),
  gaId: getAnalyticsId(),
  isTelegramMiniApp: isTelegramMiniApp(),
  // Bloquear anuncios automáticamente en miniapp
  blockAds: isTelegramMiniApp()
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
