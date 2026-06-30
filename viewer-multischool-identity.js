(function(){
  if (window.__viewerMultischoolIdentityLoaded) return;
  window.__viewerMultischoolIdentityLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_identity_' + slug;
  const isDefaultSchool = slug === 'alsheikh-saif';
  let identity = null;
  let observerStarted = false;
  let applying = false;

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__viewerIdentityClient) {
      window.__viewerIdentityClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__viewerIdentityClient;
  }

  function safeText(value){ return String(value || '').trim(); }
  function getLogo(data){ return safeText(data && (data.app_icon_url || data.logo_url)); }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.data) return null;
      if (Date.now() - Number(cached.savedAt || 0) > 24 * 60 * 60 * 1000) return null;
      return cached.data;
    } catch (error) { return null; }
  }

  function writeCache(data){
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })); }
    catch (error) {}
  }

  function cleanOtherSchoolSessionHints(){
    if (isDefaultSchool) return;
    try {
      ['school_timer_settings_alsheikh-saif','school_timer_identity_alsheikh-saif','school_timer_messages_alsheikh-saif','school_timer_middle_cards_alsheikh-saif','school_timer_scheduled_alsheikh-saif'].forEach((key) => localStorage.removeItem(key));
    } catch (error) {}
  }

  function earlyReset(){
    if (isDefaultSchool) return;
    const nameEl = document.getElementById('schoolName');
    const visionEl = document.getElementById('visionText');
    const logo = document.getElementById('schoolLogo');
    const ticker = document.getElementById('tickerTrack');

    if (nameEl && (!identity || !identity.school_name)) nameEl.textContent = '--';
    if (visionEl && (visionEl.textContent || '').includes('الشيخ سيف')) visionEl.textContent = '--';
    if (logo && (!identity || !getLogo(identity))) {
      logo.removeAttribute('src');
      logo.style.display = 'none';
    }
    if (ticker && (ticker.textContent || '').includes('مدرسة الشيخ سيف بن حمد الأغبري')) ticker.replaceChildren();
  }

  function setIconLinks(iconUrl){
    if (!iconUrl) return;
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => { link.href = iconUrl; });
    if (!document.querySelector('link[rel="icon"]')) {
      const link = document.createElement('link'); link.rel = 'icon'; link.href = iconUrl; document.head.appendChild(link);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const link = document.createElement('link'); link.rel = 'apple-touch-icon'; link.href = iconUrl; document.head.appendChild(link);
    }
  }

  function setDynamicManifest(data){
    const name = safeText(data && data.school_name) || 'مؤقت الحصص';
    const icon = getLogo(data);
    const manifest = {
      name: 'مؤقت الحصص - ' + name,
      short_name: 'مؤقت الحصص',
      start_url: 'index.html?school=' + encodeURIComponent(slug) + '&view=mobile',
      scope: './',
      display: 'standalone',
      background_color: '#f8f2e8',
      theme_color: '#0f766e',
      dir: 'rtl',
      lang: 'ar',
      icons: icon ? [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ] : []
    };
    try {
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      const url = URL.createObjectURL(blob);
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
      link.href = url;
    } catch (error) {}
  }

  function applyIdentity(data){
    if (!data) return;
    applying = true;
    identity = data;
    const schoolName = safeText(data.school_name);
    const logoUrl = getLogo(data);

    if (schoolName) {
      document.title = schoolName + ' - مؤقت الحصص';
      const nameEl = document.getElementById('schoolName');
      if (nameEl && nameEl.textContent !== schoolName) nameEl.textContent = schoolName;
      try { if (window.settings) window.settings.schoolName = schoolName; } catch (error) {}
    }

    const logo = document.getElementById('schoolLogo');
    if (logo) {
      if (logoUrl) {
        if (logo.src !== logoUrl) logo.src = logoUrl;
        logo.style.display = '';
      } else if (!isDefaultSchool) {
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }

    if (logoUrl) setIconLinks(logoUrl);
    setDynamicManifest(data);
    cleanWrongSchoolText();
    applying = false;
  }

  function cleanWrongSchoolText(){
    if (isDefaultSchool) return;
    const replacement = identity && identity.school_name ? 'مرحبًا بكم في ' + identity.school_name : 'مرحبًا بكم في مدرستكم';
    document.querySelectorAll('.ticker-item, #tickerTrack span').forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('مدرسة الشيخ سيف بن حمد الأغبري')) el.textContent = replacement;
    });
  }

  function startObserver(){
    if (observerStarted || !window.MutationObserver) return;
    observerStarted = true;
    const target = document.body || document.documentElement;
    const observer = new MutationObserver(function(){
      if (applying) return;
      if (identity) applyIdentity(identity);
      else earlyReset();
      cleanWrongSchoolText();
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src','style'] });
    setTimeout(() => observer.disconnect(), 30000);
  }

  async function loadIdentity(){
    cleanOtherSchoolSessionHints();
    const cached = readCache();
    if (cached) applyIdentity(cached);
    else earlyReset();

    const db = getClient();
    if (!db) return;
    try {
      const { data, error } = await db
        .from('schools')
        .select('school_name,school_slug,logo_url,app_icon_url,is_active')
        .eq('school_slug', slug)
        .maybeSingle();
      if (error || !data) return;
      writeCache(data);
      applyIdentity(data);
    } catch (error) {}
  }

  function start(){
    earlyReset();
    startObserver();
    loadIdentity();
    let runs = 0;
    const timer = setInterval(function(){
      if (identity) applyIdentity(identity);
      else earlyReset();
      cleanWrongSchoolText();
      runs += 1;
      if (runs >= 80) clearInterval(timer);
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
