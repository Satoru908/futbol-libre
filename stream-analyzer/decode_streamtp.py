"""
Decodificador para streamtpnew.com
Extrae y decodifica la URL M3U8 ofuscada
"""

import re
import base64
import requests

def decode_streamtp_url(html):
    """Decodifica la URL M3U8 de streamtpnew.com"""
    
    print("\n[DECODIFICANDO streamtpnew.com]")
    
    # 1. Extraer el array dA
    da_match = re.search(r'dA=\[(.*?)\];', html, re.DOTALL)
    if not da_match:
        print("❌ No se encontró el array dA")
        return None
    
    da_content = da_match.group(1)
    print(f"✓ Array dA encontrado ({len(da_content)} chars)")
    
    # 2. Extraer pares [index, base64]
    pairs = re.findall(r'\[(\d+),"([^"]+)"\]', da_content)
    print(f"✓ Encontrados {len(pairs)} pares [index, base64]")
    
    # 3. Ordenar por índice
    pairs.sort(key=lambda x: int(x[0]))
    
    # 4. Extraer las funciones de offset
    ayabs_match = re.search(r'function ayaBS\(\)\{return (\d+);\}', html)
    vrtod_match = re.search(r'function vRTOd\(\)\{return (\d+);\}', html)
    
    if not ayabs_match or not vrtod_match:
        print("❌ No se encontraron las funciones de offset")
        return None
    
    ayabs = int(ayabs_match.group(1))
    vrtod = int(vrtod_match.group(1))
    k = ayabs + vrtod
    
    print(f"✓ ayaBS() = {ayabs}")
    print(f"✓ vRTOd() = {vrtod}")
    print(f"✓ k = {k}")
    
    # 5. Decodificar cada par
    decoded_url = ""
    for index, b64_value in pairs:
        # Decodificar base64
        decoded = base64.b64decode(b64_value).decode('utf-8')
        
        # Extraer solo los dígitos
        digits = ''.join(filter(str.isdigit, decoded))
        
        if digits:
            # Convertir a número y restar k
            char_code = int(digits) - k
            
            # Convertir a carácter
            char = chr(char_code)
            decoded_url += char
    
    print(f"\n✅ URL DECODIFICADA:")
    print(f"   {decoded_url}")
    
    return decoded_url

def test_m3u8_url(url):
    """Prueba si la URL M3U8 funciona"""
    
    print(f"\n[PROBANDO M3U8]")
    print(f"URL: {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://streamtpnew.com/',
        'Origin': 'https://streamtpnew.com'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ M3U8 obtenido exitosamente ({len(response.text)} bytes)")
            print(f"\nPrimeras 15 líneas:")
            for i, line in enumerate(response.text.split('\n')[:15], 1):
                print(f"  {i:2d}. {line}")
            
            # Analizar el M3U8
            lines = response.text.split('\n')
            ts_segments = [line for line in lines if line and not line.startswith('#')]
            
            print(f"\n✓ Segmentos .ts encontrados: {len(ts_segments)}")
            
            if ts_segments:
                print(f"\nEjemplo de segmento:")
                print(f"  {ts_segments[0]}")
                
                # Extraer dominio
                if ts_segments[0].startswith('http'):
                    domain = ts_segments[0].split('/')[2]
                    print(f"\n✓ Dominio de streaming: {domain}")
            
            return True
        else:
            print(f"❌ Error: Status {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def compare_with_la14hd():
    """Compara la seguridad de streamtpnew vs la14hd"""
    
    print("\n" + "="*80)
    print("COMPARACIÓN DE SEGURIDAD")
    print("="*80)
    
    print("\nstreamtpnew.com:")
    print("  ✓ Ofuscación: JavaScript simple (base64 + offset)")
    print("  ✓ Tokens: No visibles en el código")
    print("  ✓ Protección IP: Desconocida (hay que probar)")
    print("  ✓ Complejidad: BAJA - fácil de decodificar")
    
    print("\nla14hd.com:")
    print("  ✓ Ofuscación: Variable JavaScript simple")
    print("  ✓ Tokens: Tokens con expiración en URLs")
    print("  ✓ Protección IP: Alta (bloquea proxies conocidos)")
    print("  ✓ Complejidad: MEDIA - tokens expiran rápido")
    
    print("\n" + "="*80)
    print("CONCLUSIÓN:")
    print("="*80)
    print("streamtpnew.com parece MÁS FÁCIL de usar:")
    print("  1. Ofuscación más simple")
    print("  2. Posiblemente menos protecciones anti-proxy")
    print("  3. Tokens pueden ser más duraderos")
    print("\nPero hay que probar si bloquea IPs de proxies (Render, Vercel, etc.)")

if __name__ == "__main__":
    # Leer el HTML guardado
    try:
        with open('stream_analysis_streamtpnew_com.html', 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Decodificar URL
        m3u8_url = decode_streamtp_url(html)
        
        if m3u8_url:
            # Probar la URL
            test_m3u8_url(m3u8_url)
            
            # Comparar con la14hd
            compare_with_la14hd()
            
            print("\n" + "="*80)
            print("SIGUIENTE PASO:")
            print("="*80)
            print("Probar si Render puede descargar de este dominio:")
            print(f"  1. Extraer dominio del M3U8")
            print(f"  2. Probar descarga desde Render")
            print(f"  3. Si funciona, es MÁS FÁCIL que la14hd.com")
        
    except FileNotFoundError:
        print("❌ No se encontró stream_analysis_streamtpnew_com.html")
        print("Ejecuta primero: python analyze.py")
