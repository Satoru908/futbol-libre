const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const apiRoutes = require('./routes/api.routes');
const requestLogger = require('./middlewares/request-logger.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');
const logger = require('./utils/logger');
const { initScheduledTasks } = require('./config/scheduler');

// Dependencias de Rendimiento
const compression = require('compression');

const app = express();

// 1. CORS - Permitir todos los orígenes (DEBE estar ANTES de las rutas)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: false
}));

// 2. Rendimiento: Comprimir respuestas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 3. Middlewares Básicos
app.use(express.json());
app.use(requestLogger);

// 4. Security Headers - Bloquear anuncios y scripts maliciosos
app.use((req, res, next) => {
  // Content Security Policy - Bloquea iframes de anuncios
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src * data: blob:; font-src 'self' data:; connect-src *; frame-src 'self';"
  );
  // Evitar clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// 5. Servir archivos estáticos del frontend
// Usar path.resolve para que funcione tanto en desarrollo como en Docker
// En desarrollo: __dirname es backend/src, frontend está en ../../frontend
// En Docker (Railway): __dirname es /app/src, frontend está en ../frontend
const isDevelopment = process.env.NODE_ENV !== 'production';
const frontendPath = isDevelopment
  ? path.resolve(__dirname, '../../frontend')
  : path.resolve(__dirname, '../frontend');
  
console.log('[INFO] Frontend path:', frontendPath);
console.log('[INFO] NODE_ENV:', process.env.NODE_ENV);
app.use(express.static(frontendPath));

// 6. Routes API
app.use('/api', apiRoutes);

// Error handler
app.use(errorHandler);

// Healthcheck - Debe estar DESPUÉS de los middlewares estáticos
app.get('/', (req, res) => {
    res.status(200).json({ 
      status: 'OK',
      message: 'API Backend Fútbol Libre - Direct Stream Mode',
      frontend: 'Disponible en /'
    });
});

// Inicializar tareas programadas
initScheduledTasks();

// Start server
const PORT = process.env.PORT || 8787;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Healthcheck: http://localhost:${PORT}/api/health`);
});
