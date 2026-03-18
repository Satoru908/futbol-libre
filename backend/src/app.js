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

// 4. Security Headers - Permitir solo dominios de vídeo, bloquear anuncios
app.use((req, res, next) => {
  // Content Security Policy - Lista blanca de dominios de video, bloquea anuncios
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src * data: blob:; font-src 'self' data:; connect-src *; frame-src 'self' la14hd.com *.la14hd.com hls.com *.hls.com twitch.tv *.twitch.tv youtube.com *.youtube.com;"
  );
  // Permitir que se use en iframes (necesario para Telegram Mini App)
  res.setHeader('X-Frame-Options', 'ALLOWALL');
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

// 6. Routes API (ANTES del fallback SPA - importante!)
app.use('/api', apiRoutes);

// 7. SPA Fallback - Servir index.html para rutas que no son API
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  // Si no es una ruta API, servir index.html (para SPA routing)
  res.sendFile(require('path').join(frontendPath, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Healthcheck
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
