# Usar una imagen ligera de Node.js oficial
FROM node:20-bullseye-slim

# REQUISITO DE HUGGING FACE:
# Las imágenes oficiales de NodeJS ya traen por defecto un usuario llamado "node" que tiene el UID 1000.
# Hugging Face requiere que usemos exactamente el UID 1000, así que usaremos al usuario existente.
USER node
ENV PATH="/home/node/.local/bin:$PATH"

# Establecer el directorio de trabajo dentro del entorno del usuario node
WORKDIR /home/node/app

# Copiar archivos de configuración de NPM manteniendo los permisos para el usuario 'node'
COPY --chown=node package*.json ./

# Instalar solo las dependencias de producción (más rápido e ignora devDependencies)
RUN npm ci --only=production

# Copiar el código del proyecto manteniendo permisos
COPY --chown=node . .

# Puerto: por defecto 3000 (Railway). Se puede sobrescribir con PORT env var
# Ejemplo para Hugging Face: docker run -e PORT=7860 ...
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
