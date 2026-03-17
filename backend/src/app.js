const express = require('express');
const env = require('./config/env');
const apiRoutes = require('./routes/api.routes');
const configureCors = require('./middlewares/cors.middleware');
const requestLogger = require('./middlewares/request-logger.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');
const logger = require('./utils/logger');
const { initScheduledTasks } = require('./config/scheduler');

const app = express();

// Middlewares
app.use(configureCors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api', apiRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

// Inicializar tareas programadas
initScheduledTasks();

// Start server
app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
    logger.info(`Healthcheck: http://localhost:${env.PORT}/api/health`);
});
