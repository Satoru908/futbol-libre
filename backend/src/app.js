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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
  max: 1000, // Límite de 1000 peticiones por IP en 15 mins (ideal para video HLS y playlists)
  standardHeaders: true, 
  legacyHeaders: false,
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos.'
  }
});
app.use('/api/', limiter); // Aplicar solo a rutas API

// 4. Middlewares Básicos
app.use(configureCors());
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
app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${env.PORT}`);
    logger.info(`Healthcheck: http://localhost:${env.PORT}/api/health`);
});
