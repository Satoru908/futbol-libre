"""
Analizador de streams - streamtpnew.com
Extrae información sobre cómo funciona el streaming
"""

import requests
import re
import json
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup

def analyze_stream(url):
    """Analiza una URL de stream y extrae toda la información posible"""
    
    print(f"\n{'='*80}")
    print(f"ANALIZANDO: {url}")
    print(f"{'='*80}\n")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://streamtpnew.com/',
        'Origin': 'https://streamtpnew.com'
    }
    
    try:
        # 1. Obtener HTML
        print("[1] Obteniendo HTML...")
        response = requests.get(url, headers=headers, timeout=15)
        print(f"    Status: {response.status_code}")
        print(f"    Content-Type: {response.headers.get('content-type')}")
        print(f"    Content-Length: {len(response.text)} bytes")
        
        if response.status_code != 200:
            print(f"    ❌ Error: Status {response.status_code}")
            return
        
        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # 2. Buscar M3U8 URLs
        print("\n[2] Buscando URLs M3U8...")
        m3u8_patterns = [
            r'https?://[^\s\'"<>]+\.m3u8[^\s\'"<>]*',
            r'var\s+playbackURL\s*=\s*["\']([^"\']+)["\']',
            r'source:\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
            r'file:\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
            r'src:\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
        ]
        
        m3u8_urls = set()
        for pattern in m3u8_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match else ''
                if match and '.m3u8' in match:
                    m3u8_urls.add(match)
        
        if m3u8_urls:
            print(f"    ✅ Encontradas {len(m3u8_urls)} URLs M3U8:")
            for m3u8_url in m3u8_urls:
                print(f"       - {m3u8_url}")
        else:
            print("    ⚠️ No se encontraron URLs M3U8 directas")
        
        # 3. Buscar iframes
        print("\n[3] Buscando iframes...")
        iframes = soup.find_all('iframe')
        if iframes:
            print(f"    ✅ Encontrados {len(iframes)} iframes:")
            for i, iframe in enumerate(iframes, 1):
                src = iframe.get('src', '')
                print(f"       [{i}] {src}")
        else:
            print("    ⚠️ No se encontraron iframes")
        
        # 4. Buscar scripts externos
        print("\n[4] Buscando scripts externos...")
        scripts = soup.find_all('script', src=True)
        if scripts:
            print(f"    ✅ Encontrados {len(scripts)} scripts:")
            for i, script in enumerate(scripts, 1):
                src = script.get('src', '')
                print(f"       [{i}] {src}")
        else:
            print("    ⚠️ No se encontraron scripts externos")
        
        # 5. Buscar variables JavaScript importantes
        print("\n[5] Analizando JavaScript inline...")
        js_patterns = {
            'playbackURL': r'var\s+playbackURL\s*=\s*["\']([^"\']+)["\']',
            'streamURL': r'var\s+streamURL\s*=\s*["\']([^"\']+)["\']',
            'videoURL': r'var\s+videoURL\s*=\s*["\']([^"\']+)["\']',
            'source': r'source:\s*["\']([^"\']+)["\']',
            'file': r'file:\s*["\']([^"\']+)["\']',
            'token': r'token["\']?\s*[:=]\s*["\']([^"\']+)["\']',
        }
        
        found_vars = {}
        for var_name, pattern in js_patterns.items():
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                found_vars[var_name] = matches
        
        if found_vars:
            print("    ✅ Variables encontradas:")
            for var_name, values in found_vars.items():
                print(f"       {var_name}:")
                for value in values:
                    print(f"         - {value[:100]}{'...' if len(value) > 100 else ''}")
        else:
            print("    ⚠️ No se encontraron variables conocidas")
        
        # 6. Buscar dominios de streaming
        print("\n[6] Buscando dominios de streaming...")
        streaming_domains = [
            'fubohd.com', 'streamtpnew.com', 'la14hd.com',
            'cloudflare', 'akamai', 'fastly', 'cdn'
        ]
        
        found_domains = set()
        for domain in streaming_domains:
            if domain in html.lower():
                # Extraer URLs completas con ese dominio
                domain_pattern = rf'https?://[^\s\'"<>]*{re.escape(domain)}[^\s\'"<>]*'
                matches = re.findall(domain_pattern, html, re.IGNORECASE)
                if matches:
                    found_domains.add(domain)
                    print(f"    ✅ Dominio encontrado: {domain}")
                    for match in matches[:3]:  # Mostrar solo 3 ejemplos
                        print(f"       - {match[:100]}{'...' if len(match) > 100 else ''}")
        
        if not found_domains:
            print("    ⚠️ No se encontraron dominios conocidos")
        
        # 7. Analizar headers de respuesta
        print("\n[7] Headers de respuesta:")
        important_headers = ['server', 'x-powered-by', 'content-security-policy', 'access-control-allow-origin']
        for header in important_headers:
            value = response.headers.get(header)
            if value:
                print(f"    {header}: {value}")
        
        # 8. Guardar HTML para análisis manual
        print("\n[8] Guardando HTML...")
        filename = f"stream_analysis_{urlparse(url).netloc.replace('.', '_')}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"    ✅ Guardado en: {filename}")
        
        # 9. Intentar obtener M3U8 si se encontró
        if m3u8_urls:
            print("\n[9] Intentando obtener M3U8...")
            for m3u8_url in list(m3u8_urls)[:1]:  # Solo el primero
                try:
                    m3u8_response = requests.get(m3u8_url, headers=headers, timeout=10)
                    print(f"    Status: {m3u8_response.status_code}")
                    if m3u8_response.status_code == 200:
                        print(f"    ✅ M3U8 obtenido ({len(m3u8_response.text)} bytes)")
                        print(f"    Primeras líneas:")
                        for line in m3u8_response.text.split('\n')[:10]:
                            print(f"       {line}")
                        
                        # Guardar M3U8
                        m3u8_filename = "stream_playlist.m3u8"
                        with open(m3u8_filename, 'w', encoding='utf-8') as f:
                            f.write(m3u8_response.text)
                        print(f"    ✅ M3U8 guardado en: {m3u8_filename}")
                    else:
                        print(f"    ❌ Error obteniendo M3U8: {m3u8_response.status_code}")
                except Exception as e:
                    print(f"    ❌ Error: {e}")
        
        # 10. Resumen
        print(f"\n{'='*80}")
        print("RESUMEN:")
        print(f"{'='*80}")
        print(f"✓ M3U8 URLs encontradas: {len(m3u8_urls)}")
        print(f"✓ iframes encontrados: {len(iframes)}")
        print(f"✓ Scripts externos: {len(scripts)}")
        print(f"✓ Variables JS: {len(found_vars)}")
        print(f"✓ Dominios de streaming: {len(found_domains)}")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Analizar streamtpnew.com
    url = "https://streamtpnew.com/global1.php?stream=espn"
    analyze_stream(url)
    
    print("\n" + "="*80)
    print("Para comparar, también puedes analizar la14hd.com:")
    print("="*80)
    
    # Opcional: analizar la14hd.com para comparar
    compare = input("\n¿Quieres analizar la14hd.com también? (s/n): ").lower()
    if compare == 's':
        url2 = "https://la14hd.com/vivo/canales.php?stream=espn"
        analyze_stream(url2)
