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
    def __init__(self, max_size=50):
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
    match = re.search(r'var\s+playbackURL\s*=\s*["\']([^"\']+)["\']', html)
    if match:
        return match.group(1)
    return None

@app.get("/m3u8")
async def get_m3u8(stream: str = Query(...)):
    try:
        logger.info(f"[RENDER M3U8] ========== NEW REQUEST ==========")
        logger.info(f"[RENDER M3U8] Stream: {stream}")
        
        # Log de variables de entorno
        vercel_cdn_url = os.environ.get('VERCEL_CDN_URL', '')
        logger.info(f"[RENDER M3U8] VERCEL_CDN_URL configured: {vercel_cdn_url if vercel_cdn_url else 'NOT SET'}")
        
        provider_url = f"https://la14hd.com/vivo/canales.php?stream={stream}"
        logger.info(f"[RENDER M3U8] Fetching HTML from: {provider_url}")
        html_response = requests.get(provider_url, headers=LA14HD_HEADERS, timeout=30)
        
        if html_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Error fetching from la14hd.com")
        
        m3u8_url = extract_m3u8_url(html_response.text)
        if not m3u8_url:
            logger.error(f"[RENDER M3U8] Could not extract M3U8 URL from HTML")
            raise HTTPException(status_code=502, detail="Could not extract M3U8 URL")
        
        logger.info(f"[RENDER M3U8] M3U8 URL extracted: {m3u8_url[:100]}...")
        m3u8_response = requests.get(m3u8_url, headers=FUBOHD_HEADERS, timeout=30)
        
        if m3u8_response.status_code == 404:
            logger.error(f"[RENDER M3U8] Error fetching M3U8: 404")
            raise HTTPException(status_code=404, detail=f"Stream '{stream}' not available")
        
        if m3u8_response.status_code != 200:
            logger.error(f"[RENDER M3U8] Error fetching M3U8: {m3u8_response.status_code}")
            raise HTTPException(status_code=502, detail=f"Error fetching M3U8: {m3u8_response.status_code}")
        
        m3u8_content = m3u8_response.text
        base_url = m3u8_url[:m3u8_url.rfind('/') + 1]
        
        # Contar segmentos
        segment_count = len([line for line in m3u8_content.split('\n') if line and not line.startswith('#')])
        
        # Usar Vercel CDN si está configurado, sino usar Render directo
        vercel_cdn_url = os.environ.get('VERCEL_CDN_URL', '')
        
        if vercel_cdn_url:
            # Modificar para que los .ts pasen por Vercel CDN
            modified_content = re.sub(
                r'^(?!#)(.+\.ts.*)$',
                lambda m: f"{vercel_cdn_url}/api/segment?url={requests.utils.quote(base_url + m.group(1) if not m.group(1).startswith('http') else m.group(1))}",
                m3u8_content,
                flags=re.MULTILINE
            )
            logger.info(f"[RENDER M3U8] ✅ M3U8 modified with {segment_count} segments")
            logger.info(f"[RENDER M3U8] Architecture: Usuario → Vercel CDN ({vercel_cdn_url}) → Render → fubohd.com")
            # Log de ejemplo de URL modificada
            first_segment = [line for line in modified_content.split('\n') if line and not line.startswith('#')][0] if segment_count > 0 else None
            if first_segment:
                logger.info(f"[RENDER M3U8] Example segment URL: {first_segment[:120]}...")
        else:
            # Sin Vercel, usar Render directo
            render_url = os.environ.get('RENDER_URL', 'https://futbol-libre-1ahg.onrender.com')
            modified_content = re.sub(
                r'^(?!#)(.+\.ts.*)$',
                lambda m: f"{render_url}/proxy?url={requests.utils.quote(base_url + m.group(1) if not m.group(1).startswith('http') else m.group(1))}",
                m3u8_content,
                flags=re.MULTILINE
            )
            logger.info(f"[RENDER M3U8] ✅ M3U8 modified with {segment_count} segments")
            logger.info(f"[RENDER M3U8] Architecture: Usuario → Render ({render_url}) → fubohd.com")
            logger.info(f"[RENDER M3U8] ⚠️ WARNING: VERCEL_CDN_URL not configured, serving directly from Render")
        
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
        logger.error(f"[RENDER M3U8] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/proxy")
async def proxy_segment(url: str = Query(...)):
    try:
        logger.info(f"[RENDER SEGMENT] ========== NEW REQUEST ==========")
        logger.info(f"[RENDER SEGMENT] Requested URL: {url[:100]}...")
        
        cache_key = hashlib.md5(url.encode()).hexdigest()
        
        cached_data = segment_cache.get(cache_key)
        if cached_data:
            logger.info(f"[RENDER SEGMENT] ✅ Cache HIT ({len(cached_data)} bytes)")
            return Response(
                content=cached_data,
                media_type="video/mp2t",
                headers={
                    "Content-Type": "video/mp2t",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=60",
                    "X-Cache": "HIT"
                }
            )
        
        if not url or not url.startswith('http'):
            logger.error(f"[RENDER SEGMENT] Invalid URL: {url}")
            raise HTTPException(status_code=400, detail="Invalid URL")
        
        logger.info(f"[RENDER SEGMENT] Cache MISS, downloading from fubohd.com...")
        response = requests.get(url, headers=FUBOHD_HEADERS, timeout=30, stream=True)
        
        logger.info(f"[RENDER SEGMENT] Response status: {response.status_code}")
        logger.info(f"[RENDER SEGMENT] Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code != 200:
            logger.error(f"[RENDER SEGMENT] HTTP Error {response.status_code} from fubohd.com")
            logger.error(f"[RENDER SEGMENT] Response headers: {dict(response.headers)}")
            raise HTTPException(status_code=response.status_code)
        
        data = b''.join(response.iter_content(chunk_size=8192))
        logger.info(f"[RENDER SEGMENT] ✅ Downloaded {len(data)} bytes, caching...")
        segment_cache.put(cache_key, data)
        
        return Response(
            content=data,
            media_type="video/mp2t",
            headers={
                "Content-Type": "video/mp2t",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=60",
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
