(function(){
  if (window.__schoolTimerStableLinksLoaded) return;
  window.__schoolTimerStableLinksLoaded = true;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function buildStableUrl(view){
    const basePath = location.pathname.replace(/dashboard-v2\.html$/, 'index.html');
    const params = new URLSearchParams({
      school: getSchoolSlug(),
      view: view
    });
    return `${location.origin}${basePath}?${params.toString()}`;
  }

  function setStableLinks(){
    const desktop = document.getElementById('desktopUrl');
    const mobile = document.getElementById('mobileUrl');

    if (desktop) desktop.textContent = buildStableUrl('desktop');
    if (mobile) mobile.textContent = buildStableUrl('mobile');
  }

  function start(){
    setStableLinks();
    setTimeout(setStableLinks, 300);
    setTimeout(setStableLinks, 1000);
    setInterval(setStableLinks, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
