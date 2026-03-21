"""
Analizador de tokens de streamtpnew.com
Intenta entender cómo se genera el token
"""

import re
import time
import hashlib
import hmac

def analyze_token(url):
    """Analiza el token para entender su estructura"""
    
    print("\n" + "="*80)
    print("ANÁLISIS DE TOKEN")
    print("="*80)
    
    # Extraer componentes
    token_match = re.search(r'token=([^&]+)', url)
    ip_match = re.search(r'ip=([^&]+)', url)
    
    if not token_match:
        print("❌ No se encontró token en la URL")
        return
    
    token = token_match.group(1)
    ip = ip_match.group(1) if ip_match else "NO ENCONTRADA"
    
    print(f"\nURL completa:")
    print(f"  {url}\n")
    
    print(f"Token: {token}")
    print(f"IP: {ip}")
    print(f"Longitud del token: {len(token)} caracteres")
    
    # Analizar estructura del token
    print(f"\n[ESTRUCTURA DEL TOKEN]")
    
    # Buscar patrones
    parts = token.split('-')
    print(f"Partes separadas por '-': {len(parts)}")
    for i, part in enumerate(parts, 1):
        print(f"  Parte {i}: {part} ({len(part)} chars)")
        
        # Intentar interpretar
        if len(part) == 40:
            print(f"    → Posible SHA1 hash (40 hex chars)")
        elif len(part) == 32:
            print(f"    → Posible MD5 hash (32 hex chars)")
        elif part.isdigit():
            print(f"    → Número: {part}")
            # Intentar como timestamp
            try:
                timestamp = int(part)
                if 1000000000 < timestamp < 9999999999:
                    from datetime import datetime
                    dt = datetime.fromtimestamp(timestamp)
                    print(f"    → Como timestamp: {dt}")
            except:
                pass
    
    # Extraer timestamps de la URL
    print(f"\n[TIMESTAMPS EN URL]")
    timestamps = re.findall(r'(\d{10})', url)
    if timestamps:
        from datetime import datetime
        for ts in timestamps:
            dt = datetime.fromtimestamp(int(ts))
            print(f"  {ts} → {dt}")
            
        if len(timestamps) >= 2:
            diff = int(timestamps[0]) - int(timestamps[1])
            print(f"\n  Diferencia: {diff} segundos ({diff/3600:.1f} horas)")
            print(f"  → Token válido por ~{diff/3600:.1f} horas")
    
    # Intentar generar token
    print(f"\n[INTENTANDO GENERAR TOKEN]")
    
    # Hipótesis 1: SHA1(stream + ip + timestamp + secret)
    stream = "espn"
    secrets = ["", "secret", "streamtp", "global", "key", "salt"]
    
    print(f"\nProbando diferentes secretos...")
    for secret in secrets:
        # Diferentes combinaciones
        combinations = [
            f"{stream}{ip}{timestamps[1] if timestamps else ''}{secret}",
            f"{stream}|{ip}|{timestamps[1] if timestamps else ''}|{secret}",
            f"{ip}{stream}{timestamps[1] if timestamps else ''}{secret}",
        ]
        
        for combo in combinations:
            # SHA1
            sha1 = hashlib.sha1(combo.encode()).hexdigest()
            if sha1 == parts[0]:
                print(f"  ✅ ENCONTRADO! SHA1('{combo}')")
                return True
            
            # MD5
            md5 = hashlib.md5(combo.encode()).hexdigest()
            if md5 == parts[0]:
                print(f"  ✅ ENCONTRADO! MD5('{combo}')")
                return True
    
    print(f"  ❌ No se pudo generar el token con secretos comunes")
    
    # Análisis de la IP en el token
    print(f"\n[IP EN TOKEN]")
    print(f"IP del cliente: {ip}")
    print(f"¿La IP está en el hash? Probablemente SÍ")
    print(f"Esto significa que:")
    print(f"  1. El token está vinculado a la IP del cliente")
    print(f"  2. Si Render descarga, la IP no coincidirá")
    print(f"  3. El servidor rechazará la petición (403)")
    
    return False

def test_token_generation():
    """Prueba si podemos generar tokens válidos"""
    
    print("\n" + "="*80)
    print("PRUEBA DE GENERACIÓN DE TOKEN")
    print("="*80)
    
    print("\nPara generar tokens necesitamos:")
    print("  1. ✓ Stream ID (espn, espn2, etc.) - LO TENEMOS")
    print("  2. ✓ IP del cliente - LO TENEMOS")
    print("  3. ✓ Timestamp de expiración - PODEMOS CALCULARLO")
    print("  4. ❌ Clave secreta del servidor - NO LA TENEMOS")
    
    print("\nSIN la clave secreta, NO podemos generar tokens válidos.")
    
    print("\n" + "="*80)
    print("ALTERNATIVAS")
    print("="*80)
    
    print("\n1. USAR TOKENS EXISTENTES (actual con la14hd.com):")
    print("   ✓ Render obtiene HTML de la14hd.com")
    print("   ✓ Extrae M3U8 URL con token fresco")
    print("   ✓ Modifica M3U8 para proxy")
    print("   ✓ Problema: Tokens expiran rápido, IP puede no coincidir")
    
    print("\n2. PROXY TRANSPARENTE (lo que intentamos con Vercel):")
    print("   ✓ Usuario pide .ts a Vercel")
    print("   ✓ Vercel pide a Render")
    print("   ✓ Render descarga de fubohd con token fresco")
    print("   ✓ Problema: fubohd puede rechazar IP de Render")
    
    print("\n3. CLIENTE DESCARGA DIRECTO (más simple):")
    print("   ✓ Railway da URL del M3U8 al cliente")
    print("   ✓ Cliente descarga .ts directamente de fubohd")
    print("   ✓ Sin proxies intermedios")
    print("   ✓ Problema: Cliente expuesto a fubohd, posibles bloqueos")
    
    print("\n" + "="*80)
    print("RECOMENDACIÓN")
    print("="*80)
    
    print("\nLa arquitectura actual (Railway → Render → Vercel) es correcta.")
    print("El problema es que Render no está devolviendo el M3U8 modificado.")
    print("\nSOLUCIÓN: Arreglar el bug de urllib.parse.quote en Render.")
    print("Después de eso, todo debería funcionar.")

if __name__ == "__main__":
    # URL de ejemplo
    url = "https://24a1.streameasthd.net:443/global/espn/index.m3u8?token=81a7f1a66c1cbf40dce49037d2d7c8ab370f9634-f7-1774102517-1774048517&ip=38.250.153.41"
    
    analyze_token(url)
    test_token_generation()
    
    print("\n" + "="*80)
    print("CONCLUSIÓN FINAL")
    print("="*80)
    print("\nNO podemos generar tokens porque:")
    print("  1. Requieren una clave secreta del servidor")
    print("  2. Están vinculados a la IP del cliente")
    print("  3. Tienen firma criptográfica (SHA1/MD5 + secret)")
    print("\nstreamtpnew.com NO es más fácil que la14hd.com")
    print("Ambos usan tokens con IP, solo cambia la ofuscación del HTML.")
    print("\nSigue usando la14hd.com con la arquitectura actual.")
