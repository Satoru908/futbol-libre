"""
Render.com - Proxy HLS Completo
Obtiene M3U8 con tokens frescos y sirve fragmentos .ts
"""

from fastapi import FastAPI, Response, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import logging
import asyncio
import re
from datetime import datetime
from collections import OrderedDict
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HLS Complete Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LA14HD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://la14hd.com/',
    'Origin': 'https://la14hd.com'
}

FUBOHD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://la14hd.com/',
    'Origin': 'https://la14hd.com'
}

# Caché en memoria para fragmentos .ts (LRU cache)
class LRUCache:
    def __init__(self, max_size=50):  # 50 fragmentos ~= 50MB
        self.cache = OrderedDict()
        self.max_size = max_size
    
    def get(self, key):
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
    
    def size(self):
        return len(self.cache)

segment_cache = LRUCache(max_size=50)

# Keep-alive task
async def keep_alive():
    await asyncio.sleep(60)
    while True:
        try:
            logger.info(f"[KEEP-ALIVE] Ping at {datetime.now()}")
            await asyncio.sleep(600)
        except Exception as e:
            logger.error(f"[KEEP-ALIVE] Error: {e}")
            await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    logger.info("[STARTUP] Starting keep-alive task")
    asyncio.create_task(keep_alive())

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "render-hls-complete-proxy",
        "time": datetime.now().isoformat(),
        "cache_size": segment_cache.size()
    }

def extract_m3u8_url(html: str) -> str:
    """Extrae la URL del M3U8 desde el HTML de la14hd.com"""
    match = re.search(r'var\s+playbackURL\s*=\s*["\']([^"\']+)["\']', html)
    if match:
        return match.group(1)
    return None

@app.get("/m3u8")
async def get_m3u8(stream: str = Query(...)):
    """Obtiene M3U8 con tokens frescos desde la14hd.com"""
    try:
        logger.info(f"[RENDER M3U8] ========== NEW REQUEST ==========")
        logger.info(f"[RENDER M3U8] Stream: {stream}")
        
        # Obtener HTML de la14hd.com
        provider_url = f"https://la14hd.com/vivo/canales.php?stream={stream}"
        logger.info(f"[RENDER M3U8] Fetching HTML from: {provider_url}")
        
        html_response = requests.get(provider_url, headers=LA14HD_HEADERS, timeout=30)
        
        if html_response.status_code != 200:
            logger.error(f"[RENDER M3U8] Error fetching HTML: {html_response.status_code}")
            raise HTTPException(status_code=502, detail="Error fetching from la14hd.com")
        
        # Extraer URL del M3U8
        m3u8_url = extract_m3u8_url(html_response.text)
        
        if not m3u8_url:
            logger.error(f"[RENDER M3U8] Could not extract M3U8 URL from HTML")
            raise HTTPException(status_code=502, detail="Could not extract M3U8 URL")
        
        logger.info(f"[RENDER M3U8] M3U8 URL extracted: {m3u8_url[:100]}...")
        
        # Obtener M3U8
        m3u8_response = requests.get(m3u8_url, headers=FUBOHD_HEADERS, timeout=30)
        
        if m3u8_response.status_code == 404:
            logger.error(f"[RENDER M3U8] Stream not available (404): {stream}")
            raise HTTPException(
                status_code=404,
                detail=f"Stream '{stream}' is not available at this time. The broadcast may not have started yet or the server is down."
            )
        
        if m3u8_response.status_code != 200:
            logger.error(f"[RENDER M3U8] Error fetching M3U8: {m3u8_response.status_code}")
            raise HTTPException(
                status_code=502,
                detail=f"Error fetching M3U8 from upstream: {m3u8_response.status_code}"
            )
        
        m3u8_content = m3u8_response.text
        base_url = m3u8_url[:m3u8_url.rfind('/') + 1]
        
        # Modificar M3U8 para que los .ts pasen por /proxy
        modified_content = re.sub(
            r'^(?!#)(.+\.ts.*)$',
            lambda m: f"https://futbol-libre-1ahg.onrender.com/proxy?url={requests.utils.quote(base_url + m.group(1) if not m.group(1).startswith('http') else m.group(1))}",
            m3u8_content,
            flags=re.MULTILINE
        )
        
        segment_count = len(re.findall(r'\.ts', modified_content))
        logger.info(f"[RENDER M3U8] ✅ M3U8 modified with {segment_count} segments")
        
        return Response(
            content=modified_content,
            media_type="application/vnd.apple.mpegurl",
            headers={
                "Content-Type": "application/vnd.apple.mpegurl",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "X-Proxy-By": "Render"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RENDER M3U8] Exception: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[RENDER M3U8] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/proxy")
async def proxy_segment(url: str = Query(...)):
    """Proxy para fragmentos .ts con tokens frescos y caché en memoria"""
    try:
        # Generar clave de caché
        cache_key = hashlib.md5(url.encode()).hexdigest()
        
        # Verificar caché
        cached_data = segment_cache.get(cache_key)
        if cached_data:
            logger.info(f"[RENDER SEGMENT] ✅ Cache HIT: {url[-40:]}")
            return Response(
                content=cached_data,
                media_type="video/mp2t",
                headers={
                    "Content-Type": "video/mp2t",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=60",
                    "X-Proxy-By": "Render",
                    "X-Cache": "HIT"
                }
            )
        
        logger.info(f"[RENDER SEGMENT] Downloading: {url[-60:]}")
        
        if not url or not url.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid URL")
        
        response = requests.get(url, headers=FUBOHD_HEADERS, timeout=30, stream=True)
        
        if response.status_code != 200:
            logger.error(f"[RENDER SEGMENT] Error {response.status_code}: {response.headers.get('x-deny-reason', 'unknown')}")
            raise HTTPException(status_code=response.status_code)
        
        data = b''.join(response.iter_content(chunk_size=8192))
        
        # Guardar en caché
        segment_cache.put(cache_key, data)
        
        logger.info(f"[RENDER SEGMENT] ✅ Downloaded & cached: {len(data)} bytes")
        
        return Response(
            content=data,
            media_type="video/mp2t",
            headers={
                "Content-Type": "video/mp2t",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=60",
                "X-Proxy-By": "Render",
                "X-Cache": "MISS"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RENDER SEGMENT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
