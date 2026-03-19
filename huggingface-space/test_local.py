"""
Script de prueba local para el proxy de Hugging Face
Ejecutar antes de deployar para verificar que funciona
"""

import requests
import time

# URL de prueba (reemplazar con una URL real de fubohd.com)
TEST_URL = "https://example.com/test.ts"

def test_health():
    """Test del endpoint de health"""
    print("\n🔍 Testing health endpoint...")
    try:
        response = requests.get("http://localhost:7860/")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_proxy():
    """Test del endpoint de proxy"""
    print("\n🔍 Testing proxy endpoint...")
    try:
        # Primera petición (MISS)
        start = time.time()
        response = requests.get(f"http://localhost:7860/proxy?url={TEST_URL}")
        elapsed = time.time() - start
        
        print(f"✅ Status: {response.status_code}")
        print(f"📦 Content-Type: {response.headers.get('content-type')}")
        print(f"📏 Content-Length: {response.headers.get('content-length')}")
        print(f"💾 X-Cache: {response.headers.get('x-cache')}")
        print(f"⏱️  Time: {elapsed:.2f}s")
        
        # Segunda petición (HIT)
        print("\n🔍 Testing cache hit...")
        start = time.time()
        response = requests.get(f"http://localhost:7860/proxy?url={TEST_URL}")
        elapsed = time.time() - start
        
        print(f"✅ Status: {response.status_code}")
        print(f"💾 X-Cache: {response.headers.get('x-cache')}")
        print(f"⏱️  Time: {elapsed:.2f}s (should be faster)")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_health_detailed():
    """Test del endpoint de health detallado"""
    print("\n🔍 Testing detailed health endpoint...")
    try:
        response = requests.get("http://localhost:7860/health")
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        print(f"📊 Cache files: {data['cache']['total_files']}")
        print(f"📊 Cache size: {data['cache']['total_size_mb']} MB")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    print("=" * 60)
    print("🧪 Testing Hugging Face HLS Proxy")
    print("=" * 60)
    
    print("\n⚠️  Make sure the server is running:")
    print("   python -m uvicorn app:app --host 0.0.0.0 --port 7860")
    print("\n" + "=" * 60)
    
    input("\nPress Enter to start tests...")
    
    results = []
    results.append(("Health Check", test_health()))
    results.append(("Proxy Test", test_proxy()))
    results.append(("Detailed Health", test_health_detailed()))
    
    print("\n" + "=" * 60)
    print("📊 Test Results")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Ready to deploy to Hugging Face")
    else:
        print("\n⚠️  Some tests failed. Fix issues before deploying.")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
