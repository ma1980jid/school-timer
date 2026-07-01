(function(){
  if (window.__schoolTimerPwaRegisterLoaded) return;
  window.__schoolTimerPwaRegisterLoaded = true;

  function isSafari(){
    const ua = navigator.userAgent || '';
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Android|FxiOS|Firefox|Edg|OPR/i.test(ua);
  }

  async function unregisterForSafari(){
    if (!('serviceWorker' in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    } catch (error) {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.indexOf('school-timer') !== -1).map((key) => caches.delete(key)));
      }
    } catch (error) {}
  }

  function register(){
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    if (isSafari()) {
      unregisterForSafari();
      return;
    }

    navigator.serviceWorker.register('./sw.js?v=pwa-fast-02', { scope: './' }).catch(function(error){
      console.warn('تعذر تسجيل Service Worker:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', register);
  } else {
    register();
  }
})();
