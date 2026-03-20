"""
Render.com - Proxy de Segmentos HLS
Alternativa a Hugging Face para descargar de fubohd.com
"""

from fastapi import FastAPI, Response, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import logging
import asyncio
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HLS Segment Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FUBOHD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://la14hd.com/',
    'Origin': 'https://la14hd.com'
}

# Keep-alive task
async def keep_alive():
    """Ping a sí mismo cada 10 minutos para evitar que Render duerma el servicio"""
    await asyncio.sleep(60)  # Esperar 1 minuto al inicio
    
    while True:
        try:
            logger.info(f"[KEEP-ALIVE] Ping at {datetime.now()}")
            # No hacer nada, solo mantener el proceso activo
            await asyncio.sleep(600)  # 10 minutos
        except Exception as e:
            logger.error(f"[KEEP-ALIVE] Error: {e}")
            await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    """Iniciar keep-alive al arrancar"""
    logger.info("[STARTUP] Starting keep-alive task")
    asyncio.create_task(keep_alive())

@app.get("/")
async def root():
    return {"status": "ok", "service": "render-hls-proxy", "time": datetime.now().isoformat()}

@app.get("/proxy")
async def proxy_segment(url: str = Query(...)):
    try:
        if not url or not url.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid URL")
        
        logger.info(f"[RENDER] Downloading: {url[:80]}...")
        
        response = requests.get(
            url,
            headers=FUBOHD_HEADERS,
            timeout=30,
            stream=True
        )
        
        if response.status_code != 200:
            logger.error(f"[RENDER] Error {response.status_code}")
            raise HTTPException(status_code=response.status_code)
        
        data = b''.join(response.iter_content(chunk_size=8192))
        
        logger.info(f"[RENDER] Success: {len(data)} bytes")
        
        return Response(
            content=data,
            media_type="video/mp2t",
            headers={
                "Content-Type": "video/mp2t",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=60",
                "X-Proxy-By": "Render"
            }
        )
        
    except Exception as e:
        logger.error(f"[RENDER] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
