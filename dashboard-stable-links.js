(function(){
  if (window.__schoolTimerStableLinksLoaded) return;
  window.__schoolTimerStableLinksLoaded = true;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function buildStableUrl(view){
    const basePath = location.pathname.replace(/dashboard-v2\.html$/, 'index.html');
    const params = new URLSearchParams({ school: getSchoolSlug(), view: view });
    return `${location.origin}${basePath}?${params.toString()}`;
  }

  function qrSrc(url){
    return 'https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=10&data=' + encodeURIComponent(url || '');
  }

  function notify(message){
    if (typeof window.toastMsg === 'function') window.toastMsg(message);
    else alert(message);
  }

  function copyText(text, okMessage){
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => notify(okMessage || 'تم النسخ')).catch(() => notify('تعذر النسخ'));
  }

  function ensureQrStyle(){
    if (document.getElementById('dashboardLinksQrStyle')) return;
    const style = document.createElement('style');
    style.id = 'dashboardLinksQrStyle';
    style.textContent = `
      .dashboard-qr-wrap{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
      .dashboard-qr-box{background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:8px;display:grid;place-items:center;text-align:center;gap:5px;min-height:168px}
      .dashboard-qr-box img{width:108px;height:108px;object-fit:contain;display:block}
      .dashboard-qr-box b{font-size:12px;color:#0f172a;margin-bottom:2px;line-height:1.4}
      .dashboard-qr-copy{height:28px!important;min-height:28px!important;border-radius:9px!important;font-size:11px!important;padding:0 8px!important;background:#f8fafc!important;color:#0f172a!important;border:1px solid #cbd5e1!important;font-weight:900!important;cursor:pointer!important}
      .moved-actions-box{background:#f8fafc;border:1px solid #d7dee8;border-radius:13px;padding:7px;margin-bottom:6px;display:grid;gap:5px}
      .moved-actions-box .moved-title{text-align:center;color:#64748b;font-size:13px;font-weight:900;margin-bottom:2px}
      .moved-actions-box button{height:32px!important;min-height:32px!important;font-size:12px!important;border-radius:10px!important}
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
    const desktopQr = qrSrc(desktopUrl);
    const mobileQr = qrSrc(mobileUrl);
    wrap.innerHTML = `
      <div class="dashboard-qr-box"><b>QR شاشة الحاسوب</b><img src="${desktopQr}" alt="QR شاشة الحاسوب"><button class="dashboard-qr-copy" data-copy-qr="${desktopQr}">نسخ QR</button></div>
      <div class="dashboard-qr-box"><b>QR الهاتف والآيباد</b><img src="${mobileQr}" alt="QR الهاتف والآيباد"><button class="dashboard-qr-copy" data-copy-qr="${mobileQr}">نسخ QR</button></div>
    `;
    wrap.querySelectorAll('[data-copy-qr]').forEach((btn) => {
      btn.onclick = () => copyText(btn.getAttribute('data-copy-qr'), 'تم نسخ رابط صورة QR');
    });
  }

  function moveSomeActionButtons(){
    try{
      const rightSection = document.querySelector('.right-panel .section');
      const leftSection = document.querySelector('.left-panel .section');
      if (!rightSection || !leftSection) return;
      let box = document.getElementById('movedActionsBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'movedActionsBox';
        box.className = 'moved-actions-box';
        box.innerHTML = '<div class="moved-title">أوامر إضافية</div>';
        rightSection.appendChild(box);
      }
      const labelsToMove = ['إدارة الرسائل','تنبيهات الهاتف','إعلانات المدرسة','الإعلانات المجدولة'];
      Array.from(leftSection.querySelectorAll('button')).forEach((button) => {
        const txt = (button.textContent || '').trim();
        if (txt.includes('دليل المستخدم') && box.contains(button)) {
          button.remove();
          return;
        }
        if (labelsToMove.some((label) => txt.includes(label)) && !box.contains(button)) {
          box.appendChild(button);
        }
      });
      Array.from(box.querySelectorAll('button')).forEach((button) => {
        if ((button.textContent || '').trim().includes('دليل المستخدم')) button.remove();
      });
    }catch(e){}
  }

  function setStableLinks(){
    const desktop = document.getElementById('desktopUrl');
    const mobile = document.getElementById('mobileUrl');
    const desktopUrl = buildStableUrl('desktop');
    const mobileUrl = buildStableUrl('mobile');

    if (desktop) desktop.textContent = desktopUrl;
    if (mobile) mobile.textContent = mobileUrl;
    ensureQrBlocks(desktopUrl, mobileUrl);
    moveSomeActionButtons();
  }

  function start(){
    setStableLinks();
    setTimeout(setStableLinks, 300);
    setTimeout(setStableLinks, 1000);
    setTimeout(setStableLinks, 2500);
    setInterval(setStableLinks, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
