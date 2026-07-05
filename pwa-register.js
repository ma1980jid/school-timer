(function(){
  if (window.__schoolTimerPwaRegisterLoaded) return;
  window.__schoolTimerPwaRegisterLoaded = true;

  async function disableServiceWorkerAndCache(){
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
    } catch (error) {}

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => String(key || '').indexOf('school-timer') !== -1)
            .map((key) => caches.delete(key))
        );
      }
    } catch (error) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableServiceWorkerAndCache);
  } else {
    disableServiceWorkerAndCache();
  }
})();
