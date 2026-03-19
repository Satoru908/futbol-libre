"""
Script para mantener el Hugging Face Space despierto
Hacer ping cada 5 minutos para evitar que se duerma

Ejecutar en Railway o en un servidor separado
"""

import requests
import time
import os
from datetime import datetime

# URL de tu Hugging Face Space
HF_SPACE_URL = os.getenv('HF_PROXY_URL', 'https://tu-usuario-hls-segment-proxy.hf.space')

# Intervalo de ping (5 minutos)
PING_INTERVAL = 5 * 60  # segundos


def ping_space():
    """Hace ping al space para mantenerlo despierto"""
    try:
        start = time.time()
        response = requests.get(f"{HF_SPACE_URL}/", timeout=30)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Ping successful ({elapsed:.2f}s)")
            return True
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⚠️  Ping returned {response.status_code}")
            return False
            
    except requests.Timeout:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⏱️  Timeout (space might be waking up)")
        return False
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ Error: {e}")
        return False


def main():
    print("=" * 60)
    print("🔄 Hugging Face Space Keep-Alive")
    print("=" * 60)
    print(f"Target: {HF_SPACE_URL}")
    print(f"Interval: {PING_INTERVAL} seconds ({PING_INTERVAL // 60} minutes)")
    print("=" * 60)
    print("\nStarting keep-alive loop...\n")
    
    # Primer ping inmediato
    ping_space()
    
    # Loop infinito
    while True:
        time.sleep(PING_INTERVAL)
        ping_space()


if __name__ == "__main__":
    main()
