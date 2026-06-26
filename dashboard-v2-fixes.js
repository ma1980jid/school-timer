(function(){
  if (window.__schoolTimerDashboardV2FixesLoaded) return;
  window.__schoolTimerDashboardV2FixesLoaded = true;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function buildViewUrl(view){
    const origin = location.origin;
    const basePath = location.pathname.replace(/dashboard-v2\.html$/, 'index.html');
    const params = new URLSearchParams({
      school: getSchoolSlug(),
      view,
      v: '6'
    });

    return `${origin}${basePath}?${params.toString()}`;
  }

  function updateLink(id, view){
    const element = document.getElementById(id);
    if (!element) return;

    const url = buildViewUrl(view);
    if (element.textContent !== url) {
      element.textContent = url;
    }
  }

  function refreshLinks(){
    updateLink('desktopUrl', 'desktop');
    updateLink('mobileUrl', 'mobile');
  }

  function start(){
    refreshLinks();
    setTimeout(refreshLinks, 300);
    setTimeout(refreshLinks, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
