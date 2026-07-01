(function(){
  if (window.__viewerNoDefaultSchoolLoaded) return;
  window.__viewerNoDefaultSchoolLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  if (slug === 'alsheikh-saif') return;

  function getIdentity(){
    try {
      const cached = JSON.parse(localStorage.getItem('school_timer_identity_' + slug) || 'null');
      return cached && cached.data ? cached.data : null;
    } catch (error) { return null; }
  }

  function getLogo(data){
    return data && (data.app_icon_url || data.logo_url) ? String(data.app_icon_url || data.logo_url).trim() : '';
  }

  function applyNeutral(){
    const name = document.getElementById('schoolName');
    const vision = document.getElementById('visionText');
    const logo = document.getElementById('schoolLogo');
    const ticker = document.getElementById('tickerTrack');

    const identity = getIdentity();
    const schoolName = identity && identity.school_name ? identity.school_name : 'جارٍ تحميل بيانات المدرسة';
    const schoolLogo = getLogo(identity);

    if (name && ((name.textContent || '').includes('الشيخ سيف') || name.textContent === '--')) {
      name.textContent = schoolName;
    }
    if (vision && (vision.textContent || '').includes('الشيخ سيف')) {
      vision.textContent = '';
    }
    if (logo) {
      const src = logo.getAttribute('src') || '';
      if (schoolLogo) {
        logo.src = schoolLogo;
        logo.style.display = '';
      } else if (src.includes('icons/school_logo')) {
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }
    if (ticker && (ticker.textContent || '').includes('مدرسة الشيخ سيف بن حمد الأغبري')) {
      ticker.replaceChildren();
    }
  }

  function start(){
    applyNeutral();
    setTimeout(applyNeutral, 100);
    setTimeout(applyNeutral, 500);
    setTimeout(applyNeutral, 1200);
    setTimeout(applyNeutral, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
