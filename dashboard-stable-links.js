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

  async function copyQrImage(qrUrl){
    try{
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard-image-not-supported');
      const response = await fetch(qrUrl, { mode:'cors', cache:'no-store' });
      if (!response.ok) throw new Error('qr-fetch-failed');
      let blob = await response.blob();
      if (blob.type !== 'image/png') blob = new Blob([blob], { type:'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('تم نسخ صورة QR');
    }catch(error){
      notify('تعذر نسخ صورة QR من هذا المتصفح. افتح QR واضغط بزر الفأرة الأيمن أو اضغط مطولًا لنسخ الصورة.');
    }
  }

  function ensureQrStyle(){
    if (document.getElementById('dashboardLinksQrStyle')) return;
    const style = document.createElement('style');
    style.id = 'dashboardLinksQrStyle';
    style.textContent = `
      .dashboard-qr-wrap{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
      .dashboard-qr-box{background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:7px;display:grid;place-items:center;text-align:center;gap:4px;min-height:158px}
      .dashboard-qr-box img{width:106px;height:106px;object-fit:contain;display:block}
      .dashboard-qr-box b{font-size:12px;color:#0f172a;margin-bottom:0;line-height:1.25}
      .dashboard-qr-copy{height:27px!important;min-height:27px!important;border-radius:9px!important;font-size:10.5px!important;padding:0 6px!important;background:#f8fafc!important;color:#0f172a!important;border:1px solid #cbd5e1!important;font-weight:900!important;cursor:pointer!important;white-space:nowrap!important}
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
      <div class="dashboard-qr-box"><b>QR الحاسوب</b><img src="${desktopQr}" alt="QR الحاسوب"><button class="dashboard-qr-copy" data-copy-qr-image="${desktopQr}">نسخ صورة QR</button></div>
      <div class="dashboard-qr-box"><b>QR الهاتف والآيباد</b><img src="${mobileQr}" alt="QR الهاتف والآيباد"><button class="dashboard-qr-copy" data-copy-qr-image="${mobileQr}">نسخ صورة QR</button></div>
    `;
    wrap.querySelectorAll('[data-copy-qr-image]').forEach((btn) => {
      btn.onclick = () => copyQrImage(btn.getAttribute('data-copy-qr-image'));
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
      const labelsToMove = ['إدارة الرسائل','تنبيهات الهاتف','إعلانات المدرسة'];
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
