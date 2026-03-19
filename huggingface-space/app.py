"""
Hugging Face Space - Proxy de Segmentos HLS
Descarga segmentos .ts de fubohd.com y los sirve a Vercel/Cloudflare

Arquitectura:
fubohd.com → Hugging Face (descarga) → Vercel (caché) → Usuarios
"""

from fastapi import FastAPI, Response, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import hashlib
import os
import time
import logging
from typing import Optional

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear app FastAPI
app = FastAPI(
    title="HLS Segment Proxy",
    description="Proxy para segmentos .ts de streaming HLS",
    version="1.0.0"
)

# CORS - Permitir todos los orígenes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de caché en disco
CACHE_DIR = "/tmp/segments"
CACHE_TTL = 60  # 60 segundos
MAX_CACHE_SIZE = 10 * 1024 * 1024 * 1024  # 10 GB

# Crear directorio de caché
os.makedirs(CACHE_DIR, exist_ok=True)

# Headers para fubohd.com
FUBOHD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://la14hd.com/',
    'Origin': 'https://la14hd.com',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
}


def get_cache_key(url: str) -> str:
    """Genera una clave de caché basada en la URL"""
    return hashlib.md5(url.encode()).hexdigest()


def get_cache_path(cache_key: str) -> str:
    """Obtiene la ruta del archivo de caché"""
    return os.path.join(CACHE_DIR, cache_key)


def is_cache_valid(cache_path: str) -> bool:
    """Verifica si el caché es válido (existe y no ha expirado)"""
    if not os.path.exists(cache_path):
        return False
    
    age = time.time() - os.path.getmtime(cache_path)
    return age < CACHE_TTL


def get_from_cache(url: str) -> Optional[bytes]:
    """Obtiene un segmento del caché en disco"""
    cache_key = get_cache_key(url)
    cache_path = get_cache_path(cache_key)
    
    if is_cache_valid(cache_path):
        try:
            with open(cache_path, 'rb') as f:
                data = f.read()
            logger.info(f"[CACHE HIT] {url[:80]}...")
            return data
        except Exception as e:
            logger.error(f"[CACHE ERROR] {e}")
            return None
    
    return None


def save_to_cache(url: str, data: bytes):
    """Guarda un segmento en el caché en disco"""
    cache_key = get_cache_key(url)
    cache_path = get_cache_path(cache_key)
    
    try:
        with open(cache_path, 'wb') as f:
            f.write(data)
        logger.info(f"[CACHE SAVED] {url[:80]}... ({len(data)} bytes)")
    except Exception as e:
        logger.error(f"[CACHE SAVE ERROR] {e}")


def cleanup_old_cache():
    """Limpia archivos de caché antiguos"""
    try:
        now = time.time()
        total_size = 0
        files = []
        
        # Obtener todos los archivos con su tamaño y edad
        for filename in os.listdir(CACHE_DIR):
            filepath = os.path.join(CACHE_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                age = now - stat.st_mtime
                files.append((filepath, stat.st_size, age))
                total_size += stat.st_size
        
        # Si excede el tamaño máximo, eliminar los más antiguos
        if total_size > MAX_CACHE_SIZE:
            files.sort(key=lambda x: x[2], reverse=True)  # Ordenar por edad (más viejo primero)
            
            for filepath, size, age in files:
                if total_size <= MAX_CACHE_SIZE * 0.8:  # Dejar 80% del máximo
                    break
                os.remove(filepath)
                total_size -= size
                logger.info(f"[CACHE CLEANUP] Removed {filepath}")
        
        # Eliminar archivos expirados
        for filepath, size, age in files:
            if age > CACHE_TTL * 2:  # Doble del TTL
                try:
                    os.remove(filepath)
                    logger.info(f"[CACHE CLEANUP] Expired {filepath}")
                except:
                    pass
                    
    except Exception as e:
        logger.error(f"[CACHE CLEANUP ERROR] {e}")


def validate_segment(data: bytes, content_type: str) -> bool:
    """Valida que el segmento descargado sea válido"""
    # Verificar tamaño mínimo (1 KB)
    if len(data) < 1000:
        logger.error(f"[VALIDATION] Segment too small: {len(data)} bytes")
        return False
    
    # CRÍTICO: Detectar si es HTML o JSON (error común)
    try:
        text_preview = data[:200].decode('utf-8', errors='ignore').strip()
        if text_preview.startswith('<!DOCTYPE') or text_preview.startswith('<html') or '<body' in text_preview:
            logger.error(f"[VALIDATION] Response is HTML, not video segment. Preview: {text_preview[:100]}")
            return False
        if text_preview.startswith('{') or text_preview.startswith('['):
            logger.error(f"[VALIDATION] Response is JSON, not video segment. Preview: {text_preview[:100]}")
            return False
    except:
        pass  # Si no se puede decodificar, probablemente es binario (bueno)
    
    # Verificar Content-Type
    if content_type:
        ct_lower = content_type.lower()
        if 'html' in ct_lower or 'json' in ct_lower or 'text' in ct_lower:
            logger.error(f"[VALIDATION] Invalid Content-Type: {content_type}")
            return False
    
    # CRÍTICO: Verificar que empiece con sync byte de MPEG-TS (0x47)
    # Si no tiene el sync byte, el fragmento está corrupto y HLS.js no podrá parsearlo
    if data[0] != 0x47:
        logger.error(f"[VALIDATION] Missing MPEG-TS sync byte (0x47), found: 0x{data[0]:02x}")
        # Mostrar primeros bytes para debugging
        hex_preview = ' '.join(f'{b:02x}' for b in data[:32])
        logger.error(f"[VALIDATION] First 32 bytes: {hex_preview}")
        return False
    
    # Verificar múltiples sync bytes (cada 188 bytes en MPEG-TS)
    # Esto asegura que el fragmento tiene estructura válida
    packet_size = 188
    sync_count = 0
    sync_positions = []
    for i in range(0, min(len(data), packet_size * 10), packet_size):
        if i < len(data) and data[i] == 0x47:
            sync_count += 1
            sync_positions.append(i)
    
    if sync_count < 3:
        logger.error(f"[VALIDATION] Not enough MPEG-TS sync bytes found: {sync_count} at positions {sync_positions}")
        return False
    
    logger.info(f"[VALIDATION] ✅ Valid MPEG-TS segment: {len(data)} bytes, {sync_count} sync bytes at {sync_positions[:5]}")
    return True


def download_segment(url: str, max_retries: int = 3) -> tuple[bytes, str]:
    """
    Descarga un segmento .ts de fubohd.com con retry logic
    
    Returns:
        tuple: (data, content_type)
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            logger.info(f"[DOWNLOAD] Attempt {attempt + 1}/{max_retries}: {url[:80]}...")
            
            # Descargar con timeout de 120 segundos
            # IMPORTANTE: stream=True para evitar problemas con fragmentos grandes
            response = requests.get(
                url,
                headers=FUBOHD_HEADERS,
                timeout=120,
                stream=True,
                allow_redirects=True
            )
            
            logger.info(f"[DOWNLOAD] Response status: {response.status_code}, Content-Type: {response.headers.get('content-type')}, Content-Length: {response.headers.get('content-length')}")
            
            # Leer todo el contenido de una vez para asegurar que esté completo
            data = b''
            chunk_count = 0
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    data += chunk
                    chunk_count += 1
            
            logger.info(f"[DOWNLOAD] Downloaded {len(data)} bytes in {chunk_count} chunks")
            
            # Verificar status code
            if response.status_code != 200:
                logger.error(f"[DOWNLOAD] HTTP {response.status_code}: {url[:80]}...")
                if attempt < max_retries - 1:
                    time.sleep(1)  # Esperar 1 segundo antes de reintentar
                    continue
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error downloading from fubohd.com: {response.status_code}"
                )
            
            content_type = response.headers.get('content-type', 'video/mp2t')
            content_length = response.headers.get('content-length')
            
            # Verificar que el tamaño descargado coincida con Content-Length
            if content_length and len(data) != int(content_length):
                logger.error(f"[DOWNLOAD] Size mismatch: expected {content_length}, got {len(data)}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                raise HTTPException(
                    status_code=500,
                    detail="Downloaded segment size mismatch"
                )
            
            # Validar segmento
            if not validate_segment(data, content_type):
                if attempt < max_retries - 1:
                    logger.warning(f"[DOWNLOAD] Invalid segment, retrying...")
                    time.sleep(1)
                    continue
                raise HTTPException(
                    status_code=500,
                    detail="Downloaded segment is invalid or corrupted"
                )
            
            logger.info(f"[DOWNLOAD SUCCESS] {len(data)} bytes from {url[:80]}...")
            return data, content_type
            
        except requests.Timeout as e:
            last_error = e
            logger.error(f"[DOWNLOAD] Timeout on attempt {attempt + 1}: {url[:80]}...")
            if attempt < max_retries - 1:
                time.sleep(2)  # Esperar 2 segundos antes de reintentar
                continue
                
        except requests.RequestException as e:
            last_error = e
            logger.error(f"[DOWNLOAD] Request error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
    
    # Si llegamos aquí, todos los intentos fallaron
    raise HTTPException(
        status_code=500,
        detail=f"Failed to download segment after {max_retries} attempts: {str(last_error)}"
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    cache_files = len([f for f in os.listdir(CACHE_DIR) if os.path.isfile(os.path.join(CACHE_DIR, f))])
    cache_size = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in os.listdir(CACHE_DIR) if os.path.isfile(os.path.join(CACHE_DIR, f)))
    
    return {
        "status": "ok",
        "service": "hls-segment-proxy",
        "version": "1.0.0",
        "architecture": "fubohd.com → Hugging Face → Vercel → Users",
        "cache": {
            "files": cache_files,
            "size_mb": round(cache_size / 1024 / 1024, 2),
            "max_size_gb": MAX_CACHE_SIZE / 1024 / 1024 / 1024,
            "ttl_seconds": CACHE_TTL
        }
    }


@app.get("/proxy")
async def proxy_segment(url: str = Query(..., description="URL del segmento .ts a descargar")):
    """
    Proxy endpoint para segmentos .ts
    
    Descarga segmentos de fubohd.com y los sirve con headers correctos
    """
    try:
        # Verificar que la URL sea válida
        if not url or not url.startswith('http'):
            logger.error(f"[PROXY] Invalid URL: {url}")
            raise HTTPException(status_code=400, detail="Invalid URL parameter")
        
        logger.info(f"[PROXY] ========== NEW REQUEST ==========")
        logger.info(f"[PROXY] Requested URL: {url[:100]}...")
        
        # Intentar obtener del caché
        cached_data = get_from_cache(url)
        if cached_data:
            # IMPORTANTE: Validar que el caché sea válido antes de devolverlo
            content_type = "video/mp2t"
            if not validate_segment(cached_data, content_type):
                logger.warning(f"[CACHE] Cached segment is invalid, re-downloading")
                # Eliminar del caché corrupto
                cache_key = get_cache_key(url)
                cache_path = get_cache_path(cache_key)
                try:
                    os.remove(cache_path)
                    logger.info(f"[CACHE] Removed invalid cache file: {cache_key}")
                except Exception as e:
                    logger.error(f"[CACHE] Error removing cache: {e}")
            else:
                return Response(
                    content=cached_data,
                    media_type="video/mp2t",
                    headers={
                        "Content-Type": "video/mp2t",
                        "Content-Length": str(len(cached_data)),
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
                        "Cache-Control": "public, max-age=60",
                        "X-Cache": "HIT",
                        "X-Proxy-By": "Hugging Face Space"
                    }
                )
        
        # Descargar de fubohd.com
        data, content_type = download_segment(url)
        
        # Guardar en caché
        save_to_cache(url, data)
        
        # Limpiar caché antiguo (cada 10 requests)
        import random
        if random.randint(1, 10) == 1:
            cleanup_old_cache()
        
        # Retornar con headers correctos
        return Response(
            content=data,
            media_type="video/mp2t",
            headers={
                "Content-Type": "video/mp2t",
                "Content-Length": str(len(data)),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
                "Cache-Control": "public, max-age=60",
                "X-Cache": "MISS",
                "X-Proxy-By": "Hugging Face Space"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.options("/proxy")
async def proxy_options():
    """Handle CORS preflight requests"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
        }
    )


@app.get("/health")
async def health():
    """Health check endpoint con estadísticas detalladas"""
    cache_files = []
    total_size = 0
    
    try:
        for filename in os.listdir(CACHE_DIR):
            filepath = os.path.join(CACHE_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                age = time.time() - stat.st_mtime
                cache_files.append({
                    "file": filename,
                    "size_kb": round(stat.st_size / 1024, 2),
                    "age_seconds": round(age, 2)
                })
                total_size += stat.st_size
    except Exception as e:
        logger.error(f"[HEALTH] Error reading cache: {e}")
    
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "cache": {
            "total_files": len(cache_files),
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "max_size_gb": MAX_CACHE_SIZE / 1024 / 1024 / 1024,
            "ttl_seconds": CACHE_TTL,
            "files": cache_files[:10]  # Mostrar solo los primeros 10
        }
    }


@app.get("/debug-segment")
async def debug_segment(url: str = Query(..., description="URL del segmento .ts a diagnosticar")):
    """
    Endpoint de diagnóstico para verificar qué está devolviendo fubohd.com
    """
    try:
        if not url or not url.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid URL parameter")
        
        logger.info(f"[DEBUG] Testing download from: {url[:100]}...")
        
        # Intentar descargar
        response = requests.get(
            url,
            headers=FUBOHD_HEADERS,
            timeout=30,
            stream=True,
            allow_redirects=True
        )
        
        # Leer contenido
        data = b''
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                data += chunk
        
        # Información básica
        info = {
            "url": url[:100] + "..." if len(url) > 100 else url,
            "status_code": response.status_code,
            "content_type": response.headers.get('content-type', 'N/A'),
            "content_length_header": response.headers.get('content-length', 'N/A'),
            "actual_size": len(data),
            "headers": dict(response.headers)
        }
        
        # Verificar si es HTML o JSON
        is_html = False
        is_json = False
        text_preview = ""
        
        try:
            text_preview = data[:500].decode('utf-8', errors='ignore')
            if text_preview.startswith('<!DOCTYPE') or text_preview.startswith('<html') or '<body' in text_preview:
                is_html = True
            if text_preview.strip().startswith('{') or text_preview.strip().startswith('['):
                is_json = True
        except:
            pass
        
        # Validar MPEG-TS
        is_valid_ts = False
        sync_bytes = []
        first_bytes_hex = ""
        
        if len(data) > 0:
            first_bytes_hex = ' '.join(f'{b:02x}' for b in data[:64])
            
            # Verificar sync bytes
            packet_size = 188
            for i in range(0, min(len(data), packet_size * 10), packet_size):
                if i < len(data) and data[i] == 0x47:
                    sync_bytes.append(i)
            
            is_valid_ts = len(sync_bytes) >= 3 and data[0] == 0x47
        
        return {
            "success": True,
            "info": info,
            "validation": {
                "is_html": is_html,
                "is_json": is_json,
                "is_valid_mpeg_ts": is_valid_ts,
                "sync_bytes_found": len(sync_bytes),
                "sync_byte_positions": sync_bytes[:10],
                "first_byte": f"0x{data[0]:02x}" if len(data) > 0 else "N/A",
                "first_64_bytes_hex": first_bytes_hex
            },
            "preview": {
                "text": text_preview if (is_html or is_json) else "Binary data (not text)",
                "length": len(text_preview)
            }
        }
        
    except Exception as e:
        logger.error(f"[DEBUG] Error: {e}")
        return {
            "success": False,
            "error": str(e),
            "traceback": str(e.__traceback__)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
