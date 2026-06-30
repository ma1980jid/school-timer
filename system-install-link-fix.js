(function(){
  if (window.__systemInstallLinkFixLoaded) return;
  window.__systemInstallLinkFixLoaded = true;

  function toInstallUrl(oldUrl){
    try {
      const url = new URL(oldUrl, location.href);
      const school = url.searchParams.get('school') || 'alsheikh-saif';
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'install.html?school=' + encodeURIComponent(school);
    } catch (error) {
      return '';
    }
  }

  function copy(text){
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function patch(){
    const appUrl = document.getElementById('url_app');
    if (!appUrl) return;
    const current = appUrl.textContent || '';
    if (!current.includes('app=1') && !current.includes('index.html')) return;
    const next = toInstallUrl(current);
    if (!next) return;
    appUrl.textContent = next;
    const btn = document.querySelector('[data-copy="app"]');
    if (btn) btn.onclick = function(){ copy(next); };
  }

  function loadSingleDesignCleanup(){
    if (window.__systemAdminSingleDesignCleanupRequested) return;
    window.__systemAdminSingleDesignCleanupRequested = true;
    const script = document.createElement('script');
    script.src = 'system-admin-single-design-cleanup.js?v=system-single-design-02';
    script.defer = true;
    document.head.appendChild(script);
  }

  function start(){
    patch();
    setInterval(patch, 1200);
    loadSingleDesignCleanup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
