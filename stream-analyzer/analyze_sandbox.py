"""
Analiza si streamtpnew.com tiene protección anti-sandbox
"""

import re

def analyze_sandbox_protection(html):
    """Analiza el código anti-sandbox"""
    
    print("\n" + "="*80)
    print("ANÁLISIS DE PROTECCIÓN ANTI-SANDBOX")
    print("="*80)
    
    # Buscar el script ofuscado de protección
    protection_script = re.search(r'<script>!function\(\)\{try\{var t=\[(.*?)\}\(\);?</script>', html, re.DOTALL)
    
    if not protection_script:
        print("\n✅ NO se encontró código anti-sandbox")
        return True
    
    print("\n❌ SE ENCONTRÓ CÓDIGO ANTI-SANDBOX")
    print("\nDecodificando protecciones...")
    
    # Array ofuscado
    array_match = re.search(r'var t=\[(.*?)\]', protection_script.group(0))
    if array_match:
        items = [item.strip('"') for item in array_match.group(1).split(',')]
        print(f"\nArray de strings ofuscados ({len(items)} elementos):")
        for i, item in enumerate(items[:10]):  # Mostrar solo los primeros 10
            print(f"  t[{i}] = '{item}'")
    
    # Detectar verificaciones específicas
    checks = []
    
    # 1. Verificación de sandbox attribute
    if 'window[t[2]][t[1]](t[0])' in protection_script.group(0):
        print("\n[CHECK 1] Verifica si el iframe tiene atributo 'sandbox'")
        print("  → window.frameElement.hasAttribute('sandbox')")
        print("  → Si detecta sandbox, redirige a /block.html")
        checks.append(('sandbox_attribute', True))
    
    # 2. Verificación de document.domain
    if 'document.domain=document.domain' in protection_script.group(0):
        print("\n[CHECK 2] Verifica document.domain")
        print("  → Intenta modificar document.domain")
        print("  → Si falla (sandbox), redirige a /block.html")
        checks.append(('document_domain', True))
    
    # 3. Verificación de frameElement
    if 'window.frameElement' in protection_script.group(0):
        print("\n[CHECK 3] Verifica window.frameElement")
        print("  → Detecta si está en un iframe")
        print("  → Verifica si el iframe tiene sandbox")
        checks.append(('frame_element', True))
    
    # 4. Verificación de window.parent
    if 'window.parent' in protection_script.group(0):
        print("\n[CHECK 4] Verifica window.parent")
        print("  → Detecta si está en un iframe")
        checks.append(('window_parent', True))
    
    print("\n" + "="*80)
    print("RESUMEN DE PROTECCIONES")
    print("="*80)
    
    print(f"\nTotal de verificaciones: {len(checks)}")
    for check_name, detected in checks:
        print(f"  ✓ {check_name}")
    
    print("\n" + "="*80)
    print("¿SE PUEDE USAR SANDBOX?")
    print("="*80)
    
    if len(checks) > 0:
        print("\n❌ NO - streamtpnew.com tiene protección anti-sandbox")
        print("\nSi usas <iframe sandbox>, el código detectará:")
        print("  1. window.frameElement.hasAttribute('sandbox') → TRUE")
        print("  2. document.domain = document.domain → ERROR")
        print("  3. Redirigirá a /block.html en 500ms")
        
        print("\n" + "="*80)
        print("ALTERNATIVAS")
        print("="*80)
        
        print("\n1. IFRAME SIN SANDBOX (menos seguro):")
        print("   <iframe src='...' allow='autoplay'></iframe>")
        print("   ✓ Funciona")
        print("   ✗ Permite scripts, popups, ads")
        
        print("\n2. OBTENER M3U8 EN BACKEND (recomendado):")
        print("   ✓ Railway decodifica el HTML")
        print("   ✓ Devuelve URL M3U8 directa")
        print("   ✓ Usuario descarga sin iframe")
        print("   ✓ Más seguro y rápido")
        
        print("\n3. PROXY INVERSO:")
        print("   ✓ Railway sirve el HTML modificado")
        print("   ✓ Elimina el script anti-sandbox")
        print("   ✗ Más complejo, puede romper funcionalidad")
        
        return False
    else:
        print("\n✅ SÍ - No se detectaron protecciones")
        return True

def test_sandbox_workarounds():
    """Prueba posibles workarounds"""
    
    print("\n" + "="*80)
    print("WORKAROUNDS POSIBLES")
    print("="*80)
    
    print("\n1. SANDBOX CON PERMISOS ESPECÍFICOS:")
    print("   <iframe sandbox='allow-scripts allow-same-origin' src='...'></iframe>")
    print("   ✗ NO FUNCIONA - allow-same-origin permite acceso a frameElement")
    
    print("\n2. SANDBOX SOLO CON allow-scripts:")
    print("   <iframe sandbox='allow-scripts' src='...'></iframe>")
    print("   ✗ NO FUNCIONA - document.domain falla y detecta sandbox")
    
    print("\n3. SIN SANDBOX:")
    print("   <iframe src='...' allow='autoplay'></iframe>")
    print("   ✓ FUNCIONA - Pero permite todo (ads, popups, etc.)")
    
    print("\n" + "="*80)
    print("RECOMENDACIÓN FINAL")
    print("="*80)
    
    print("\nNO uses iframe de streamtpnew.com directamente.")
    print("\nEn su lugar:")
    print("  1. Railway obtiene HTML de streamtpnew.com")
    print("  2. Railway decodifica el M3U8 URL")
    print("  3. Railway devuelve URL directa al frontend")
    print("  4. Frontend usa HLS.js para reproducir")
    print("\nEsto es:")
    print("  ✓ Más seguro (sin iframe de terceros)")
    print("  ✓ Más rápido (sin ads ni scripts innecesarios)")
    print("  ✓ Más control (puedes cachear, modificar, etc.)")
    print("  ✓ Sin protecciones anti-sandbox")

if __name__ == "__main__":
    with open('stream_analysis_streamtpnew_com.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    can_use_sandbox = analyze_sandbox_protection(html)
    test_sandbox_workarounds()
    
    print("\n" + "="*80)
    print("CONCLUSIÓN")
    print("="*80)
    
    if can_use_sandbox:
        print("\n✅ Puedes usar sandbox sin problemas")
    else:
        print("\n❌ NO puedes usar sandbox")
        print("✅ Usa el provider de Railway que ya implementamos")
        print("   (backend/src/providers/streamtpnew.provider.js)")
