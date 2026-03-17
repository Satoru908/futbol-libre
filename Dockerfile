# Usar una imagen ligera de Node.js oficial
FROM node:20-bullseye-slim

# REQUISITO DE HUGGING FACE:
# Ejecutar siempre como un usuario que no sea root y con ID 1000
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de NPM manteniendo los permisos para el usuario 'user'
COPY --chown=user package*.json ./

# Instalar solo las dependencias de producción (más rápido e ignora devDependencies)
RUN npm ci --only=production

# Copiar el código del proyecto manteniendo permisos
COPY --chown=user . .

# REQUISITO DE HUGGING FACE:
# Forzar a la aplicación a escuchar en el puerto 7860
ENV PORT=7860
EXPOSE 7860

# Comando para iniciar el servidor
CMD ["npm", "start"]
