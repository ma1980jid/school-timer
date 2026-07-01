(function(){
  if (window.__viewerMultischoolIdentityLoaded) return;
  window.__viewerMultischoolIdentityLoaded = true;

  const urlParams = new URLSearchParams(location.search);
  const slug = urlParams.get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_identity_' + slug;
  const isDefaultSchool = slug === 'alsheikh-saif';
  let identity = null;

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
      if (Date.now() - Number(cached.savedAt || 0) > 6 * 60 * 60 * 1000) return null;
      return cached.data;
    } catch (error) { return null; }
  }

  function writeCache(data){
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })); }
    catch (error) {}
  }

  function cleanDefaultSchoolCache(){
    if (isDefaultSchool) return;
    try {
      ['school_timer_settings_alsheikh-saif','school_timer_identity_alsheikh-saif','school_timer_messages_alsheikh-saif','school_timer_middle_cards_alsheikh-saif','school_timer_scheduled_alsheikh-saif'].forEach((key) => localStorage.removeItem(key));
    } catch (error) {}
  }

  function hideDefaultLogoUntilReady(){
    if (isDefaultSchool) return;
    const logo = document.getElementById('schoolLogo');
    if (!logo || identity) return;
    logo.removeAttribute('src');
    logo.style.display = 'none';
  }

  function setIconLinks(iconUrl){
    if (!iconUrl) return;
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => { link.href = iconUrl; });
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
      const manifestUrl = URL.createObjectURL(blob);
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
      link.href = manifestUrl;
    } catch (error) {}
  }

  function applyIdentity(data){
    if (!data) return;
    identity = data;
    const schoolName = safeText(data.school_name);
    const logoUrl = getLogo(data);

    if (schoolName) {
      document.title = schoolName + ' - مؤقت الحصص';
      const nameEl = document.getElementById('schoolName');
      if (nameEl) nameEl.textContent = schoolName;
      try { if (window.settings) window.settings.schoolName = schoolName; } catch (error) {}
    }

    const logo = document.getElementById('schoolLogo');
    if (logo) {
      if (logoUrl) {
        logo.src = logoUrl;
        logo.style.display = '';
      } else if (!isDefaultSchool) {
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }

    if (logoUrl) setIconLinks(logoUrl);
    setDynamicManifest(data);
    cleanWrongSchoolText();
  }

  function cleanWrongSchoolText(){
    if (isDefaultSchool) return;
    const replacement = identity && identity.school_name ? 'مرحبًا بكم في ' + identity.school_name : 'مرحبًا بكم في مدرستكم';
    document.querySelectorAll('.ticker-item, #tickerTrack span').forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('مدرسة الشيخ سيف بن حمد الأغبري')) el.textContent = replacement;
    });
  }

  async function loadIdentity(){
    cleanDefaultSchoolCache();
    hideDefaultLogoUntilReady();

    const cached = readCache();
    if (cached) applyIdentity(cached);

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
    hideDefaultLogoUntilReady();
    loadIdentity();
    setTimeout(loadIdentity, 700);
    setTimeout(function(){ if (identity) applyIdentity(identity); cleanWrongSchoolText(); }, 1400);
    setTimeout(function(){ if (identity) applyIdentity(identity); cleanWrongSchoolText(); }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
