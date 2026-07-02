(function(){
  if (window.__schoolTimerPwaRegisterLoaded) return;
  window.__schoolTimerPwaRegisterLoaded = true;

  const SAFARI_CLEAN_VERSION = 'safari-clean-03';
  const SW_URL = './sw.js?v=pwa-fast-04';

  function isSafari(){
    const ua = navigator.userAgent || '';
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Android|FxiOS|Firefox|Edg|OPR/i.test(ua);
  }

  function safariAlreadyCleaned(){
    try { return localStorage.getItem('school_timer_safari_clean_version') === SAFARI_CLEAN_VERSION; }
    catch (error) { return false; }
  }

  function markSafariCleaned(){
    try { localStorage.setItem('school_timer_safari_clean_version', SAFARI_CLEAN_VERSION); }
    catch (error) {}
  }

  async function cleanupOldSafariCacheOnce(){
    if (!isSafari()) return;
    if (safariAlreadyCleaned()) return;

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

    markSafariCleaned();
  }

  async function register(){
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    await cleanupOldSafariCacheOnce();

    navigator.serviceWorker.register(SW_URL, { scope: './' }).catch(function(error){
      console.warn('تعذر تسجيل Service Worker:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', register);
  } else {
    register();
  }
})();
