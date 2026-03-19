#!/bin/bash

# Script para actualizar el backend con la URL del Cloudflare Worker
# Uso: ./update-backend.sh https://m3u8-proxy.tu-usuario.workers.dev

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar la URL del Worker"
  echo "Uso: ./update-backend.sh https://m3u8-proxy.tu-usuario.workers.dev"
  exit 1
fi

WORKER_URL="$1"

# Validar que la URL termine sin barra
if [[ "$WORKER_URL" == */ ]]; then
  WORKER_URL="${WORKER_URL%/}"
fi

echo "🔧 Actualizando backend con Worker URL: $WORKER_URL"

# Actualizar el archivo api.routes.js
sed -i.bak "s|const corsProxy = corsProxies\[0\];|const corsProxy = '$WORKER_URL/?url=';|g" ../backend/src/routes/api.routes.js

if [ $? -eq 0 ]; then
  echo "✅ Backend actualizado correctamente"
  echo "📝 Backup guardado en: backend/src/routes/api.routes.js.bak"
  echo ""
  echo "Próximos pasos:"
  echo "1. git add backend/src/routes/api.routes.js"
  echo "2. git commit -m 'Configurar Cloudflare Worker como proxy'"
  echo "3. git push origin hls"
else
  echo "❌ Error al actualizar el backend"
  exit 1
fi
