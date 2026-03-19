#!/bin/bash

# Script de deployment para Vercel Edge Function Proxy
# Uso: ./deploy.sh

echo "🚀 Deployando Proxy CORS a Vercel..."
echo ""

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI no está instalado"
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Verificar login
echo "🔐 Verificando autenticación..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  No estás autenticado en Vercel"
    echo "🔑 Iniciando login..."
    vercel login
fi

# Deploy
echo ""
echo "📤 Deployando a producción..."
vercel --prod

echo ""
echo "✅ Deploy completado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Copia la URL que te dio Vercel (ej: https://tu-proyecto.vercel.app)"
echo "2. Actualiza backend/src/routes/api.routes.js con tu URL"
echo "3. Reemplaza la primera línea del array corsProxies:"
echo "   'https://tu-proyecto.vercel.app/api/proxy?url=',"
echo ""
