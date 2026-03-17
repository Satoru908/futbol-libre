/**
 * Constantes de la aplicación
 * 
 * Sistema automático de detección de URL del backend usando variables de entorno:
 * - Desarrollo (localhost): http://localhost:8787/api
 * - Producción: Variable de entorno VITE_API_URL_PROD o URL de Railway
 * 
 * Las URLs se pueden configurar mediante:
 * 1. Variables de entorno (build time): VITE_API_URL_DEV, VITE_API_URL_PROD
 * 2. Variables globales en window (runtime): window.API_BASE_URL
 * 3. Fallbacks automáticos
 */

const getApiBaseUrl = () => {
  // Primero intentar variable global (inyectada en runtime)
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }

  // Luego intentar variables de build time (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    if (isDev && import.meta.env.VITE_API_URL_DEV) {
      return import.meta.env.VITE_API_URL_DEV;
    }
    if (!isDev && import.meta.env.VITE_API_URL_PROD) {
      return import.meta.env.VITE_API_URL_PROD;
    }
  }

  // Fallback automático basado en hostname
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  const LOCAL_URL = 'http://localhost:8787/api';
  const PROD_URL = 'https://futbol-libre-production-5102.up.railway.app/api';
  
  return isLocalhost ? LOCAL_URL : PROD_URL;
};

const getSiteUrl = () => {
  // Variables de entorno build-time
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }
  
  // Variable global runtime
  if (typeof window !== 'undefined' && window.SITE_URL) {
    return window.SITE_URL;
  }
  
  // Fallback
  return 'https://futbollibrevivo.netlify.app';
};

const getAnalyticsId = () => {
  // Variables de entorno build-time
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_ID) {
    return import.meta.env.VITE_GA_ID;
  }
  
  // Variable global runtime
  if (typeof window !== 'undefined' && window.GA_MEASUREMENT_ID) {
    return window.GA_MEASUREMENT_ID;
  }
  
  // Fallback (vacío si no está configurado)
  return '';
};

export const APP_CONFIG = {
  // API endpoints - no archivo local
  channelsDataUrl: `${getApiBaseUrl()}/channels`,
  agendaDataUrl: `${getApiBaseUrl()}/agenda`,
  defaultLogo: 'assets/logos/default.png',
  apiBaseUrl: getApiBaseUrl(),
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
