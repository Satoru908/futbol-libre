/**
 * Anti-Redirect & Anti-Popup Protection
 * Bloquea pop-ups, pop-unders y redirects no deseados
 */

export function initAntiRedirect() {
  // Bloquear window.open (pop-ups)
  const originalOpen = window.open;
  window.open = function(...args) {
    console.log('[ANTI-REDIRECT] Bloqueado window.open:', args[0]);
    return null;
  };

  // Bloquear cambios de location
  let isUserNavigation = false;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    if (!isUserNavigation) {
      console.log('[ANTI-REDIRECT] Bloqueado pushState');
      return;
    }
    return originalPushState.apply(this, args);
  };

  history.replaceState = function(...args) {
    if (!isUserNavigation) {
      console.log('[ANTI-REDIRECT] Bloqueado replaceState');
      return;
    }
    return originalReplaceState.apply(this, args);
  };

  // Permitir navegación del usuario
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button');
    if (target) {
      isUserNavigation = true;
      setTimeout(() => { isUserNavigation = false; }, 100);
    }
  }, true);

  // Bloquear beforeunload malicioso
  window.addEventListener('beforeunload', (e) => {
    if (!isUserNavigation) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Bloquear focus/blur tricks (pop-unders)
  let lastFocusTime = Date.now();
  window.addEventListener('blur', () => {
    if (Date.now() - lastFocusTime < 1000) {
      console.log('[ANTI-REDIRECT] Bloqueado blur trick');
      setTimeout(() => window.focus(), 10);
    }
  });

  window.addEventListener('focus', () => {
    lastFocusTime = Date.now();
  });

  console.log('[ANTI-REDIRECT] ✅ Protección activada');

  // Cleanup function
  return () => {
    window.open = originalOpen;
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}
