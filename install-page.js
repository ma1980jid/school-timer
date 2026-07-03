(function(){
  const $ = (id) => document.getElementById(id);
  const slug = new URLSearchParams(location.search).get('school') || 'alsheikh-saif';
  const knownNames = {
    'alsheikh-saif': 'مدرسة الشيخ سيف بن حمد الأغبري (5-12) بنين'
  };

  function baseUrl(){
    return location.origin + location.pathname.replace(/[^/]*$/, '');
  }

  function withVersion(url, label){
    const next = new URL(url);
    next.searchParams.set('v', label + '-' + Date.now());
    return next.toString();
  }

  function buildUrls(){
    const base = baseUrl();
    const s = encodeURIComponent(slug);
    return {
      mobile: `${base}viewer-clean.html?school=${s}&view=mobile`,
      desktop: `${base}viewer-clean.html?school=${s}&view=desktop`,
      dashboard: `${base}dashboard-v2.html?school=${s}`,
      install: `${base}install.html?school=${s}`,
      reset: `${base}viewer-clean.html?school=${s}&view=mobile`
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
    const mobileForOpen = withVersion(links.mobile, 'viewer-clean');
    const resetForOpen = withVersion(links.reset, 'viewer-clean');

    $('schoolName').textContent = name;
    document.title = name + ' - تثبيت مؤقت الحصص';
    $('mobileUrl').textContent = mobileForOpen;
    $('desktopUrl').textContent = withVersion(links.desktop, 'viewer-clean-desktop');
    drawQr('mobileQr', mobileForOpen);
    drawQr('desktopQr', withVersion(links.desktop, 'viewer-clean-desktop'));

    $('openMobile').onclick = () => location.href = mobileForOpen;
    $('openDesktop').onclick = () => location.href = withVersion(links.desktop, 'viewer-clean-desktop');
    $('copyMobile').onclick = () => copy(mobileForOpen);
    $('copyDesktop').onclick = () => copy(withVersion(links.desktop, 'viewer-clean-desktop'));
    const cleanButton = $('cleanAndOpen');
    if (cleanButton) cleanButton.onclick = () => location.href = resetForOpen;

    const all = shareMessage(name, links);
    $('shareText').textContent = all;
    $('copyAll').onclick = () => copy(all);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
