@echo off
REM Script de deployment para Vercel Edge Function Proxy (Windows)
REM Uso: deploy.bat

echo 🚀 Deployando Proxy CORS a Vercel...
echo.

REM Verificar si Vercel CLI está instalado
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI no está instalado
    echo 📦 Instalando Vercel CLI...
    npm install -g vercel
)

REM Verificar login
echo 🔐 Verificando autenticación...
vercel whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  No estás autenticado en Vercel
    echo 🔑 Iniciando login...
    vercel login
)

REM Deploy
echo.
echo 📤 Deployando a producción...
vercel --prod

echo.
echo ✅ Deploy completado!
echo.
echo 📋 Próximos pasos:
echo 1. Copia la URL que te dio Vercel (ej: https://tu-proyecto.vercel.app)
echo 2. Actualiza backend/src/routes/api.routes.js con tu URL
echo 3. Reemplaza la primera línea del array corsProxies:
echo    'https://tu-proyecto.vercel.app/api/proxy?url=',
echo.
pause
