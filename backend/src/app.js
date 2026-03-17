const express = require('express');
const env = require('./config/env');
const apiRoutes = require('./routes/api.routes');
const configureCors = require('./middlewares/cors.middleware');
const requestLogger = require('./middlewares/request-logger.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');
const logger = require('./utils/logger');
const { initScheduledTasks } = require('./config/scheduler');

// Dependencias de Producción (Seguridad y Rendimiento)
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// Desactivar temporalmente Helmet para aislar el problema de Hugging Face
// app.use(helmet({
//   crossOriginResourcePolicy: false,
//   crossOriginEmbedderPolicy: false,
//   frameguard: false,
//   contentSecurityPolicy: false
// }));

// 2. Rendimiento: Comprimir respuestas JSON y Texto (ahorra CPU y ancho de banda)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    // No intentar comprimir video binario (.ts), Express ya lo hace bien
    // Solo comprimiremos texto como .m3u8 o .json
    return compression.filter(req, res);
  }
}));

// 3. Rate Limiting: Prevenir abusos, scraping y DDoS general
// AUMENTADO ESPECÍFICAMENTE PARA TS CHUNKS (los videos cargan docenas de chunks por segundo y bloqueaba la red)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10000, // Subido de 1000 a 10000 para no bloquear streams fluidos
  standardHeaders: true, 
  legacyHeaders: false,
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos.'
  }
});
app.use('/api/', limiter); // Aplicar solo a rutas API

// Configuración extrema de CORS para bypass de Hugging Face
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('X-Frame-Options', 'ALLOWALL'); // Forzar permiso de iframes
  
  if (req.method === 'OPTIONS') {
      return res.status(200).end();
  }
  next();
});

// 4. Middlewares Básicos
// app.use(configureCors()); // Desactivado temporalmente el configurador viejo para priorizar la regla global
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api', apiRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

// Ruta Raíz para chequeo de estado de Hugging Face
app.get('/', (req, res) => {
    res.status(200).send('API Backend Fútbol Libre Running OK');
});

// Inicializar tareas programadas
initScheduledTasks();

// Start server
// Forzando el puerto a 7860 directamente en el app.listen por requerimiento estricto de Hugging Face
const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Healthcheck: http://localhost:${PORT}/api/health`);
});
