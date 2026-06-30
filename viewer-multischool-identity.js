(function(){
  if (window.__viewerMultischoolIdentityLoaded) return;
  window.__viewerMultischoolIdentityLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_identity_' + slug;
  let identity = null;

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__viewerIdentityClient) {
      window.__viewerIdentityClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__viewerIdentityClient;
  }

  function safeText(value){ return String(value || '').trim(); }

  function getLogo(data){
    return safeText(data && (data.app_icon_url || data.logo_url));
  }

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

  function setIconLinks(iconUrl){
    if (!iconUrl) return;
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = iconUrl;
    });
    if (!document.querySelector('link[rel="icon"]')) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = iconUrl;
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = iconUrl;
      document.head.appendChild(link);
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
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = url;
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
      if (nameEl && (!nameEl.textContent || nameEl.textContent === '--' || nameEl.textContent.includes('الشيخ سيف'))) {
        nameEl.textContent = schoolName;
      }
      try { if (window.settings) window.settings.schoolName = schoolName; } catch (error) {}
    }

    const logo = document.getElementById('schoolLogo');
    if (logo) {
      if (logoUrl) {
        logo.src = logoUrl;
        logo.style.display = '';
      } else if (slug !== 'alsheikh-saif') {
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }

    if (logoUrl) setIconLinks(logoUrl);
    setDynamicManifest(data);
    cleanWrongSchoolText();
  }

  function cleanWrongSchoolText(){
    if (slug === 'alsheikh-saif') return;
    const replacement = identity && identity.school_name ? 'مرحبًا بكم في ' + identity.school_name : 'مرحبًا بكم في مدرستكم';
    document.querySelectorAll('.ticker-item, #tickerTrack span').forEach((el) => {
      if ((el.textContent || '').includes('مدرسة الشيخ سيف بن حمد الأغبري')) {
        el.textContent = replacement;
      }
    });
  }

  async function loadIdentity(){
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
    loadIdentity();
    let runs = 0;
    const timer = setInterval(function(){
      if (identity) applyIdentity(identity);
      cleanWrongSchoolText();
      runs += 1;
      if (runs >= 12) clearInterval(timer);
    }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
