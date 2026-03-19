"""
Script de prueba para verificar la descarga de segmentos .ts
Ejecutar: python test_segment_download.py
"""

import requests
import sys

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

def hex_dump(data, max_bytes=256):
    """Muestra un hex dump de los datos"""
    lines = []
    for i in range(0, min(len(data), max_bytes), 16):
        hex_part = ' '.join(f'{b:02x}' for b in data[i:i+16])
        ascii_part = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in data[i:i+16])
        lines.append(f'{i:08x}  {hex_part:<48}  |{ascii_part}|')
    return '\n'.join(lines)

def validate_mpeg_ts(data):
    """Valida que sea un segmento MPEG-TS válido"""
    print(f"\n🔍 Validación MPEG-TS:")
    print(f"   Tamaño: {len(data)} bytes")
    
    # Verificar sync byte inicial
    if data[0] == 0x47:
        print(f"   ✅ Sync byte inicial correcto: 0x{data[0]:02x}")
    else:
        print(f"   ❌ Sync byte inicial incorrecto: 0x{data[0]:02x} (esperado: 0x47)")
        return False
    
    # Verificar múltiples sync bytes
    packet_size = 188
    sync_count = 0
    sync_positions = []
    
    for i in range(0, min(len(data), packet_size * 20), packet_size):
        if data[i] == 0x47:
            sync_count += 1
            sync_positions.append(i)
    
    print(f"   Sync bytes encontrados: {sync_count}")
    print(f"   Posiciones: {sync_positions[:10]}")
    
    if sync_count >= 3:
        print(f"   ✅ Estructura MPEG-TS válida")
        return True
    else:
        print(f"   ❌ Estructura MPEG-TS inválida (pocos sync bytes)")
        return False

def test_segment(url):
    """Prueba la descarga de un segmento"""
    print(f"\n{'='*80}")
    print(f"🧪 Probando descarga de segmento")
    print(f"{'='*80}")
    print(f"URL: {url[:100]}...")
    
    try:
        print(f"\n⏳ Descargando...")
        response = requests.get(
            url,
            headers=FUBOHD_HEADERS,
            timeout=30,
            stream=True,
            allow_redirects=True
        )
        
        print(f"\n📋 Respuesta:")
        print(f"   Status: {response.status_code} {response.reason}")
        print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
        print(f"   Content-Length: {response.headers.get('content-length', 'N/A')}")
        
        # Leer contenido
        data = b''
        chunk_count = 0
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                data += chunk
                chunk_count += 1
        
        print(f"   Tamaño descargado: {len(data)} bytes en {chunk_count} chunks")
        
        # Verificar si es HTML o JSON
        try:
            text_preview = data[:200].decode('utf-8', errors='ignore').strip()
            if text_preview.startswith('<!DOCTYPE') or text_preview.startswith('<html'):
                print(f"\n❌ ¡ALERTA! La respuesta es HTML:")
                print(text_preview[:500])
                return False
            if text_preview.startswith('{') or text_preview.startswith('['):
                print(f"\n❌ ¡ALERTA! La respuesta es JSON:")
                print(text_preview[:500])
                return False
        except:
            pass
        
        # Validar MPEG-TS
        is_valid = validate_mpeg_ts(data)
        
        # Mostrar hex dump
        print(f"\n📝 Hex dump (primeros 256 bytes):")
        print(hex_dump(data, 256))
        
        return is_valid
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # URL de ejemplo del error
    test_url = 'https://ag9wzq.fubohd.com:443/espn/2026/03/19/17/08/48-06006.ts?token=6985e49cdaf35a19437e04cc2f3699bb9afd7cd7-1b-1773957223-1773939223'
    
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    
    print(f"\n🚀 Test de descarga de segmentos MPEG-TS")
    print(f"   Para probar otra URL: python {sys.argv[0]} <url>")
    
    result = test_segment(test_url)
    
    if result:
        print(f"\n✅ ÉXITO: El segmento es válido")
        sys.exit(0)
    else:
        print(f"\n❌ FALLO: El segmento es inválido o no se pudo descargar")
        sys.exit(1)
