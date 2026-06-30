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

  function qrSrc(url){
    return 'https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=10&data=' + encodeURIComponent(url || '');
  }

  function ensureQrStyle(){
    if (document.getElementById('dashboardLinksQrStyle')) return;
    const style = document.createElement('style');
    style.id = 'dashboardLinksQrStyle';
    style.textContent = `
      .dashboard-qr-wrap{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
      .dashboard-qr-box{background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:8px;display:grid;place-items:center;text-align:center}
      .dashboard-qr-box img{width:112px;height:112px;object-fit:contain;display:block}
      .dashboard-qr-box b{font-size:12px;color:#0f172a;margin-bottom:5px}
      @media(max-width:700px){.dashboard-qr-wrap{grid-template-columns:1fr}.dashboard-qr-box img{width:136px;height:136px}}
    `;
    document.head.appendChild(style);
  }

  function ensureQrBlocks(desktopUrl, mobileUrl){
    ensureQrStyle();
    const desktop = document.getElementById('desktopUrl');
    const mobile = document.getElementById('mobileUrl');
    const host = (mobile && mobile.closest('.section')) || (desktop && desktop.closest('.section')) || (mobile && mobile.parentElement) || (desktop && desktop.parentElement);
    if (!host) return;
    let wrap = document.getElementById('dashboardLinksQrWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'dashboardLinksQrWrap';
      wrap.className = 'dashboard-qr-wrap';
      host.appendChild(wrap);
    }
    wrap.innerHTML = `
      <div class="dashboard-qr-box"><b>QR شاشة الحاسوب</b><img src="${qrSrc(desktopUrl)}" alt="QR شاشة الحاسوب"></div>
      <div class="dashboard-qr-box"><b>QR الهاتف والآيباد</b><img src="${qrSrc(mobileUrl)}" alt="QR الهاتف والآيباد"></div>
    `;
  }

  function setStableLinks(){
    const desktop = document.getElementById('desktopUrl');
    const mobile = document.getElementById('mobileUrl');
    const desktopUrl = buildStableUrl('desktop');
    const mobileUrl = buildStableUrl('mobile');

    if (desktop) desktop.textContent = desktopUrl;
    if (mobile) mobile.textContent = mobileUrl;
    ensureQrBlocks(desktopUrl, mobileUrl);
  }

  function start(){
    setStableLinks();
    setTimeout(setStableLinks, 300);
    setTimeout(setStableLinks, 1000);
    setInterval(setStableLinks, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
