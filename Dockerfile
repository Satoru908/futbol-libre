# Usar una imagen ligera de Node.js oficial
FROM node:20-bullseye-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de NPM desde backend
COPY backend/package*.json ./

# Instalar solo las dependencias de producción
RUN npm ci --only=production

# Copiar el código del backend
COPY backend/src ./src

# Crear carpeta data (se llenará con scrapers)
RUN mkdir -p ./data

# Copiar el frontend
COPY frontend ./frontend

# Puerto: por defecto 3000 (Railway)
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "src/app.js"]
