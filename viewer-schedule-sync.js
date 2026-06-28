(function(){
  if (window.__viewerScheduleSyncLoaderLoaded) return;
  window.__viewerScheduleSyncLoaderLoaded = true;

  function loadDirectRenderer(){
    if (document.querySelector('script[src^="viewer-schedule-direct.js"]')) return;
    const script = document.createElement('script');
    script.src = 'viewer-schedule-direct.js?v=schedule-direct-03';
    script.defer = true;
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDirectRenderer);
  } else {
    loadDirectRenderer();
  }
})();
