/**
 * Anti-Redirect & Anti-Popup Protection
 * Bloquea pop-ups, pop-unders y redirects no deseados
 */

export function initAntiRedirect() {
  console.log('[ANTI-REDIRECT] 🚀 Iniciando protección...');
  
  // Bloquear window.open (pop-ups)
  const originalOpen = window.open;
  window.open = function(...args) {
    console.warn('[ANTI-REDIRECT] 🚫 Bloqueado window.open:', args[0]);
    console.log('[ANTI-REDIRECT] Stack trace:', new Error().stack);
    return null;
  };

  // Bloquear cambios de location
  let isUserNavigation = false;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    if (!isUserNavigation) {
      console.warn('[ANTI-REDIRECT] 🚫 Bloqueado pushState:', args);
      console.log('[ANTI-REDIRECT] Stack trace:', new Error().stack);
      return;
    }
    console.log('[ANTI-REDIRECT] ✅ Permitido pushState (navegación de usuario)');
    return originalPushState.apply(this, args);
  };

  history.replaceState = function(...args) {
    if (!isUserNavigation) {
      console.warn('[ANTI-REDIRECT] 🚫 Bloqueado replaceState:', args);
      console.log('[ANTI-REDIRECT] Stack trace:', new Error().stack);
      return;
    }
    console.log('[ANTI-REDIRECT] ✅ Permitido replaceState (navegación de usuario)');
    return originalReplaceState.apply(this, args);
  };

  // Permitir navegación del usuario
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button');
    if (target) {
      console.log('[ANTI-REDIRECT] 👆 Click de usuario detectado en:', target.tagName, target.textContent?.substring(0, 30));
      isUserNavigation = true;
      setTimeout(() => { 
        isUserNavigation = false;
        console.log('[ANTI-REDIRECT] ⏱️ Ventana de navegación cerrada');
      }, 100);
    }
  }, true);

  // Bloquear beforeunload malicioso
  window.addEventListener('beforeunload', (e) => {
    if (!isUserNavigation) {
      console.warn('[ANTI-REDIRECT] 🚫 Bloqueado beforeunload malicioso');
      console.log('[ANTI-REDIRECT] Stack trace:', new Error().stack);
      e.preventDefault();
      e.stopImmediatePropagation();
    } else {
      console.log('[ANTI-REDIRECT] ✅ Permitido beforeunload (navegación de usuario)');
    }
  }, true);

  // Bloquear focus/blur tricks (pop-unders)
  let lastFocusTime = Date.now();
  window.addEventListener('blur', () => {
    const timeSinceFocus = Date.now() - lastFocusTime;
    console.log('[ANTI-REDIRECT] 👁️ Blur detectado, tiempo desde último focus:', timeSinceFocus + 'ms');
    
    if (timeSinceFocus < 1000) {
      console.warn('[ANTI-REDIRECT] 🚫 Bloqueado blur trick (posible pop-under)');
      setTimeout(() => {
        window.focus();
        console.log('[ANTI-REDIRECT] ↩️ Focus restaurado');
      }, 10);
    }
  });

  window.addEventListener('focus', () => {
    lastFocusTime = Date.now();
    console.log('[ANTI-REDIRECT] 👁️ Focus recibido');
  });

  console.log('[ANTI-REDIRECT] ✅ Protección activada completamente');

  // Cleanup function
  return () => {
    console.log('[ANTI-REDIRECT] 🧹 Limpiando protección...');
    window.open = originalOpen;
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    console.log('[ANTI-REDIRECT] ✅ Protección desactivada');
  };
}
