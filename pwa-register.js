(function(){
  if (window.__schoolTimerPwaRegisterLoaded) return;
  window.__schoolTimerPwaRegisterLoaded = true;

  function registerServiceWorker(){
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function(){});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
  } else {
    registerServiceWorker();
  }
})();
