(function(){
  const $ = (id) => document.getElementById(id);
  const slug = new URLSearchParams(location.search).get('school') || 'alsheikh-saif';
  const knownNames = {
    'alsheikh-saif': 'مدرسة الشيخ سيف بن حمد الأغبري (5-12) بنين'
  };
  const VIEW_VERSION = 'no-default-logo-01';

  function baseUrl(){
    return location.origin + location.pathname.replace(/[^/]*$/, '');
  }

  function withFixedVersion(url){
    const next = new URL(url);
    next.searchParams.set('v', VIEW_VERSION);
    return next.toString();
  }

  function buildUrls(){
    const base = baseUrl();
    const s = encodeURIComponent(slug);
    return {
      mobile: `${base}index.html?school=${s}&view=mobile&v=${VIEW_VERSION}`,
      desktop: `${base}index.html?school=${s}&view=desktop&v=${VIEW_VERSION}`,
      dashboard: `${base}dashboard-v2.html?school=${s}`,
      install: `${base}install.html?school=${s}`,
      reset: `${base}index.html?school=${s}&view=mobile&v=${VIEW_VERSION}`
    };
  }

  function qrUrl(text){
    return 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=' + encodeURIComponent(text);
  }

  function drawQr(id, text){
    const box = $(id);
    if (!box) return;
    const img = document.createElement('img');
    img.alt = 'QR Code';
    img.src = qrUrl(text);
    img.onerror = () => {
      box.innerHTML = '<span>تعذر إنشاء QR تلقائيًا. يمكن نسخ الرابط من الأسفل.</span>';
    };
    box.replaceChildren(img);
  }

  function copy(text){
    navigator.clipboard.writeText(text).then(() => toast('تم النسخ بنجاح')).catch(() => alert(text));
  }

  function toast(text){
    let el = document.getElementById('installToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'installToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#0f172a;color:#fff;border-radius:999px;padding:10px 18px;font-family:Tahoma,Arial,sans-serif;font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = text;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.remove(), 1700);
  }

  function shareMessage(name, links){
    return [
      `روابط مؤقت الحصص — ${name}`,
      `رابط الهاتف والآيباد: ${links.mobile}`,
      `رابط شاشة الحاسوب: ${links.desktop}`,
      `رابط لوحة مدير المدرسة: ${links.dashboard}`,
      `صفحة التثبيت وQR: ${links.install}`
    ].join('\n');
  }

  function start(){
    const name = knownNames[slug] || 'تثبيت مؤقت الحصص';
    const links = buildUrls();
    const mobileForOpen = links.mobile;
    const resetForOpen = links.reset;

    $('schoolName').textContent = name;
    document.title = name + ' - تثبيت مؤقت الحصص';
    $('mobileUrl').textContent = mobileForOpen;
    $('desktopUrl').textContent = links.desktop;
    drawQr('mobileQr', mobileForOpen);
    drawQr('desktopQr', links.desktop);

    $('openMobile').onclick = () => location.href = mobileForOpen;
    $('openDesktop').onclick = () => location.href = links.desktop;
    $('copyMobile').onclick = () => copy(mobileForOpen);
    $('copyDesktop').onclick = () => copy(links.desktop);
    const cleanButton = $('cleanAndOpen');
    if (cleanButton) cleanButton.onclick = () => location.href = resetForOpen;

    const all = shareMessage(name, links);
    $('shareText').textContent = all;
    $('copyAll').onclick = () => copy(all);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();