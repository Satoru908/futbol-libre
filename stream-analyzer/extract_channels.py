"""
Extrae todos los canales de streamtpnew.com
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def extract_channels():
    """Extrae todos los canales disponibles"""
    
    print("\n" + "="*80)
    print("EXTRAYENDO CANALES DE STREAMTPNEW.COM")
    print("="*80)
    
    url = "https://streamtpnew.com"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
    
    try:
        print(f"\n[1] Obteniendo HTML de {url}...")
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"❌ Error: Status {response.status_code}")
            return
        
        print(f"✅ HTML obtenido ({len(response.text)} bytes)")
        
        # Buscar el objeto JavaScript con los canales
        channels_match = re.search(r"const channels = \{(.*?)\};", response.text, re.DOTALL)
        
        if not channels_match:
            print("❌ No se encontró el objeto 'channels' en el HTML")
            return
        
        print("\n[2] Parseando canales...")
        
        # Extraer pares nombre: url
        channel_pattern = r"'([^']+)':\s*'([^']+)'"
        matches = re.findall(channel_pattern, channels_match.group(1))
        
        channels = []
        
        for name, url in matches:
            # Extraer el stream ID de la URL
            stream_match = re.search(r'stream=([^&]+)', url)
            if stream_match:
                stream_id = stream_match.group(1)
                channels.append({
                    'name': name,
                    'streamId': stream_id,
                    'url': url
                })
        
        print(f"✅ Encontrados {len(channels)} canales")
        
        # Mostrar canales
        print("\n" + "="*80)
        print("CANALES ENCONTRADOS")
        print("="*80)
        
        for i, channel in enumerate(channels, 1):
            print(f"\n[{i}] {channel['name']}")
            print(f"    Stream ID: {channel['streamId']}")
            print(f"    URL: {channel['url'][:80]}...")
        
        # Guardar en JSON
        output_file = "streamtp_channels.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(channels, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Canales guardados en: {output_file}")
        
        # Generar formato para backend
        print("\n" + "="*80)
        print("FORMATO PARA BACKEND (channels-complete.json)")
        print("="*80)
        
        backend_channels = []
        for channel in channels:
            backend_channels.append({
                "id": channel['streamId'],
                "name": channel['name'],
                "logo": f"https://via.placeholder.com/150?text={channel['name'].replace(' ', '+')}",
                "category": "Deportes",
                "provider": "streamtp10"
            })
        
        backend_file = "streamtp_channels_backend.json"
        with open(backend_file, 'w', encoding='utf-8') as f:
            json.dump({"channels": backend_channels}, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Formato backend guardado en: {backend_file}")
        
        # Estadísticas
        print("\n" + "="*80)
        print("ESTADÍSTICAS")
        print("="*80)
        
        categories = {}
        for channel in channels:
            name_lower = channel['name'].lower()
            if 'espn' in name_lower:
                cat = 'ESPN'
            elif 'fox' in name_lower:
                cat = 'Fox Sports'
            elif 'win' in name_lower:
                cat = 'Win Sports'
            elif 'dsports' in name_lower or 'directv' in name_lower:
                cat = 'DSports'
            elif 'tnt' in name_lower:
                cat = 'TNT Sports'
            elif 'tyc' in name_lower:
                cat = 'TyC Sports'
            elif 'premiere' in name_lower or 'sporttv' in name_lower:
                cat = 'Brasil'
            elif 'usa' in name_lower or 'tudn' in name_lower or 'universo' in name_lower:
                cat = 'USA'
            elif 'mx' in name_lower or 'azteca' in name_lower:
                cat = 'México'
            else:
                cat = 'Otros'
            
            categories[cat] = categories.get(cat, 0) + 1
        
        print(f"\nTotal de canales: {len(channels)}")
        print("\nPor categoría:")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"  {cat}: {count} canales")
        
        return channels
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    channels = extract_channels()
    
    if channels:
        print("\n" + "="*80)
        print("SIGUIENTE PASO")
        print("="*80)
        print("\n1. Copia el contenido de 'streamtp_channels_backend.json'")
        print("2. Reemplaza 'backend/data/channels-complete.json'")
        print("3. Todos los canales estarán disponibles en tu app")
