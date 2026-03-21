"""
Prueba si el token funciona con diferentes IPs
Esto determina si podemos usar proxies
"""

import requests

def test_token_with_different_ips():
    """Prueba el mismo token con diferentes IPs"""
    
    print("\n" + "="*80)
    print("PRUEBA DE TOKEN CON DIFERENTES IPs")
    print("="*80)
    
    # Token original (obtenido desde tu PC)
    original_url = "https://24a1.streameasthd.net:443/global/espn/index.m3u8?token=81a7f1a66c1cbf40dce49037d2d7c8ab370f9634-f7-1774102517-1774048517&ip=38.250.153.41"
    
    # IPs a probar
    test_cases = [
        {
            "name": "IP Original (PC)",
            "ip": "38.250.153.41",
            "url": original_url
        },
        {
            "name": "IP del Celular (IPv6)",
            "ip": "2800:4b0:4016:a35f:189e:a715:a2ab:418a",
            "url": original_url.replace("ip=38.250.153.41", "ip=2800:4b0:4016:a35f:189e:a715:a2ab:418a")
        },
        {
            "name": "Sin parámetro IP",
            "ip": "N/A",
            "url": original_url.replace("&ip=38.250.153.41", "")
        },
        {
            "name": "IP Falsa (1.1.1.1)",
            "ip": "1.1.1.1",
            "url": original_url.replace("ip=38.250.153.41", "ip=1.1.1.1")
        }
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://streamtpnew.com/',
        'Origin': 'https://streamtpnew.com'
    }
    
    results = []
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[TEST {i}] {test['name']}")
        print(f"IP: {test['ip']}")
        print(f"URL: {test['url'][:80]}...")
        
        try:
            response = requests.get(test['url'], headers=headers, timeout=10)
            status = response.status_code
            
            if status == 200:
                print(f"✅ Status: {status} - TOKEN FUNCIONA!")
                print(f"   Content-Length: {len(response.text)} bytes")
                results.append((test['name'], True, status))
            elif status == 403:
                print(f"❌ Status: {status} - TOKEN RECHAZADO (IP no coincide)")
                # Intentar leer el mensaje de error
                try:
                    error_msg = response.text[:200]
                    print(f"   Error: {error_msg}")
                except:
                    pass
                results.append((test['name'], False, status))
            else:
                print(f"⚠️ Status: {status} - Respuesta inesperada")
                results.append((test['name'], False, status))
                
        except Exception as e:
            print(f"❌ Error: {e}")
            results.append((test['name'], False, "ERROR"))
    
    # Resumen
    print("\n" + "="*80)
    print("RESUMEN DE RESULTADOS")
    print("="*80)
    
    for name, success, status in results:
        icon = "✅" if success else "❌"
        print(f"{icon} {name}: {status}")
    
    # Análisis
    print("\n" + "="*80)
    print("ANÁLISIS")
    print("="*80)
    
    success_count = sum(1 for _, success, _ in results if success)
    
    if success_count == 0:
        print("\n❌ El token NO funciona con ninguna IP diferente")
        print("   → La validación de IP es ESTRICTA")
        print("   → NO podemos usar proxies (Render, Vercel, etc.)")
        print("   → Cada cliente necesita su propio token")
        
    elif success_count == len(results):
        print("\n✅ El token funciona con TODAS las IPs!")
        print("   → La validación de IP NO es estricta")
        print("   → SÍ podemos usar proxies")
        print("   → Un solo token sirve para todos")
        
    elif success_count > 1:
        print(f"\n⚠️ El token funciona con {success_count}/{len(results)} IPs")
        print("   → La validación de IP es PARCIAL")
        print("   → Puede funcionar con algunas IPs pero no todas")
        
    else:
        print("\n⚠️ Solo funciona con la IP original")
        print("   → La validación de IP es ESTRICTA")
        print("   → Necesitamos que cada cliente obtenga su propio token")
    
    # Recomendación
    print("\n" + "="*80)
    print("RECOMENDACIÓN")
    print("="*80)
    
    if success_count > 1:
        print("\n✅ BUENAS NOTICIAS!")
        print("Si el token funciona con diferentes IPs, podemos:")
        print("  1. Render obtiene token de streamtpnew.com")
        print("  2. Render usa ese token para descargar .ts")
        print("  3. Vercel cachea los .ts")
        print("  4. ¡Funciona para todos los usuarios!")
        print("\nstreamtpnew.com sería MEJOR que la14hd.com")
    else:
        print("\n❌ MALAS NOTICIAS")
        print("Si el token solo funciona con la IP original:")
        print("  1. Cada cliente necesita su propio token")
        print("  2. No podemos usar proxies intermedios")
        print("  3. streamtpnew.com NO es mejor que la14hd.com")
        print("\nSigue usando la14hd.com con la arquitectura actual")

if __name__ == "__main__":
    print("\n⚠️ IMPORTANTE:")
    print("Esta prueba usa el token que obtuviste desde tu PC.")
    print("Si el token ya expiró, todas las pruebas fallarán.")
    print("En ese caso, obtén un token nuevo ejecutando: python decode_streamtp.py")
    
    input("\nPresiona ENTER para continuar...")
    
    test_token_with_different_ips()
