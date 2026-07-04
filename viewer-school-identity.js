(function(){
  if (window.__viewerSchoolIdentityLoaded) return;
  window.__viewerSchoolIdentityLoaded = true;

  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || '__neutral__';
  const isNeutralSchool = schoolSlug === '__neutral__';
  const cacheKey = 'school_timer_identity_' + schoolSlug;
  const settingsCacheKey = 'school_timer_settings_' + schoolSlug;
  const DEFAULT_LOGO = 'icons/school_logo.png';
  let client = null;

  function getClient(){
    if (isNeutralSchool) return null;
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function writeCache(data){
    if (isNeutralSchool || !data) return;
    const taggedData = { ...data, _school_slug: schoolSlug };
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: taggedData })); } catch (error) {}
    try {
      const old = JSON.parse(localStorage.getItem(settingsCacheKey) || 'null') || {};
      const oldData = old.data || {};
      localStorage.setItem(settingsCacheKey, JSON.stringify({
        savedAt: Date.now(),
        data: { ...oldData, ...taggedData }
      }));
    } catch (error) {}
  }

  function readCache(){
    if (isNeutralSchool) return null;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.data) return null;
      if (!cached.data._school_slug || cached.data._school_slug !== schoolSlug) {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(settingsCacheKey);
        return null;
      }
      return cached.data;
    } catch (error) {
      return null;
    }
  }

  function ensureStyle(){
    if (document.getElementById('viewerSchoolIdentityStyle')) return;
    const style = document.createElement('style');
    style.id = 'viewerSchoolIdentityStyle';
    style.textContent = `
      .school-disabled-overlay{position:fixed;inset:0;z-index:999999;display:grid;place-items:center;background:linear-gradient(135deg,rgba(15,23,42,.93),rgba(15,118,110,.9));padding:24px;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#fff;text-align:center}
      .school-disabled-card{width:min(680px,92vw);background:rgba(255,255,255,.96);color:#0f172a;border-radius:28px;padding:34px 28px;box-shadow:0 30px 80px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.55)}
      .school-disabled-card img{max-height:94px;max-width:180px;object-fit:contain;margin-bottom:14px}
      .school-disabled-card h1{margin:0 0 12px;font-size:clamp(26px,3vw,42px);font-weight:900;color:#991b1b;line-height:1.35}
      .school-disabled-card p{margin:0;font-size:clamp(16px,1.6vw,24px);font-weight:900;line-height:1.9;color:#334155}
    `;
    document.head.appendChild(style);
  }

  function loadScriptOnce(src, startsWith){
    if (document.querySelector('script[src^="' + startsWith + '"]')) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function setText(id, text){
    const el = document.getElementById(id);
    if (el && text && el.textContent !== text) el.textContent = text;
  }

  function applyLogo(url){
    const cleanUrl = String(url || '').trim() || DEFAULT_LOGO;
    const logo = document.getElementById('schoolLogo');
    if (logo && logo.getAttribute('src') !== cleanUrl) {
      logo.src = cleanUrl;
      logo.alt = 'شعار المدرسة';
    }
    const icons = document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]');
    icons.forEach((link) => {
      if (cleanUrl && cleanUrl !== DEFAULT_LOGO) link.href = cleanUrl;
    });
  }

  function applySchoolName(name){
    const cleanName = String(name || '').trim();
    if (!cleanName || isNeutralSchool) return;
    try { if (window.settings) window.settings.schoolName = cleanName; } catch (error) {}
    setText('schoolName', cleanName);
    setText('mobileSchoolHeading', cleanName);
    document.title = cleanName + ' - مؤقت الحصص';
  }

  function showDisabledOverlay(data){
    ensureStyle();
    if (document.getElementById('schoolDisabledOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'schoolDisabledOverlay';
    overlay.className = 'school-disabled-overlay';
    overlay.innerHTML = `
      <div class="school-disabled-card">
        <img src="${data.logo_url || DEFAULT_LOGO}" alt="شعار المدرسة">
        <h1>هذه المدرسة غير مفعلة حاليًا</h1>
        <p>${data.school_name || 'المدرسة'}<br>يرجى التواصل مع مدير النظام لتفعيل الخدمة.</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function removeDisabledOverlay(){
    const overlay = document.getElementById('schoolDisabledOverlay');
    if (overlay) overlay.remove();
  }

  function applyIdentity(data){
    if (!data || data._school_slug !== schoolSlug || isNeutralSchool) return;
    applyLogo(data.logo_url || data.app_icon_url || DEFAULT_LOGO);
    applySchoolName(data.school_name || '');
    if (data.is_active === false) showDisabledOverlay(data);
    else removeDisabledOverlay();
  }

  async function loadIdentity(){
    if (isNeutralSchool) return;
    const db = getClient();
    if (!db) {
      const cached = readCache();
      if (cached) applyIdentity(cached);
      return;
    }
    try {
      const { data, error } = await db
        .from('schools')
        .select('school_name,school_slug,logo_url,app_icon_url,is_active,theme_style,governorate,wilayat')
        .eq('school_slug', schoolSlug)
        .maybeSingle();

      if (error || !data) {
        const cached = readCache();
        if (cached) applyIdentity(cached);
        return;
      }

      const taggedData = { ...data, _school_slug: schoolSlug };
      writeCache(taggedData);
      applyIdentity(taggedData);
    } catch (error) {
      const cached = readCache();
      if (cached) applyIdentity(cached);
    }
  }

  function start(){
    ensureStyle();
    loadScriptOnce('viewer-auto-theme.js?v=auto-theme-01', 'viewer-auto-theme.js');
    if (isNeutralSchool) return;
    const cached = readCache();
    if (cached) applyIdentity(cached);
    loadIdentity();
    setInterval(loadIdentity, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
