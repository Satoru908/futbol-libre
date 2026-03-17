const express = require('express');
const cors = require('cors');
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

// Routes
app.use('/api', apiRoutes);

// Error handler
app.use(errorHandler);

// Healthcheck
app.get('/', (req, res) => {
    res.status(200).send('API Backend Fútbol Libre - Direct Stream Mode');
});

// Inicializar tareas programadas
initScheduledTasks();

// Start server
const PORT = process.env.PORT || 8787;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Healthcheck: http://localhost:${PORT}/api/health`);
});
