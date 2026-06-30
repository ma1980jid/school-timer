(function(){
  if (window.__schoolTimerPwaRegisterLoaded) return;
  window.__schoolTimerPwaRegisterLoaded = true;

  function register(){
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function(error){
      console.warn('تعذر تسجيل Service Worker:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', register);
  } else {
    register();
  }
})();
