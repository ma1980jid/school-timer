(function(){
  if (window.__viewerMultischoolIdentityLoaded) return;
  window.__viewerMultischoolIdentityLoaded = true;

  const urlParams = new URLSearchParams(location.search);
  const slug = urlParams.get('school') || window.SCHOOL_TIMER_SLUG || '__neutral__';
  const isNeutralSchool = slug === '__neutral__';
  const cacheKey = 'school_timer_identity_' + slug;
  const isInstallPage = location.pathname.includes('install.html');
  const DEFAULT_CARD_TEXT = 'مؤقت الحصص';
  const SHARED_CLIENT_KEY = '__schoolTimerSupabaseClient';
  let identity = null;
  let identityLoading = false;

  function getClient(){
    if (isNeutralSchool) return null;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window[SHARED_CLIENT_KEY]) {
      window[SHARED_CLIENT_KEY] = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window[SHARED_CLIENT_KEY];
  }

  function safeText(value){ return String(value || '').trim(); }
  function getLogo(data){ return safeText(data && (data.app_icon_url || data.logo_url)); }

  function readCache(){
    if (isNeutralSchool) return null;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.data) return null;
      if (Date.now() - Number(cached.savedAt || 0) > 15 * 60 * 1000) return null;
      if (!cached.data._school_slug || cached.data._school_slug !== slug) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return cached.data;
    } catch (error) { return null; }
  }

  function writeCache(data){
    if (isNeutralSchool || !data) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        savedAt: Date.now(),
        data: { ...data, _school_slug: slug }
      }));
    } catch (error) {}
  }

  function clearCurrentSchoolRuntimeCaches(){
    if (isNeutralSchool) return;
    try {
      [
        'school_timer_settings_',
        'school_timer_messages_',
        'school_timer_middle_cards_',
        'school_timer_scheduled_',
        'school_timer_direct_schedule_'
      ].forEach((prefix) => localStorage.removeItem(prefix + slug));
    } catch (error) {}
  }

  function hasIdentityChanged(oldData, newData){
    if (!oldData || !newData) return false;
    return safeText(oldData.school_name) !== safeText(newData.school_name)
      || getLogo(oldData) !== getLogo(newData)
      || safeText(oldData.created_at) !== safeText(newData.created_at);
  }

  function hideDefaultLogoUntilReady(){
    if (isNeutralSchool) return;
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
    if (isNeutralSchool) return;
    const name = safeText(data && data.school_name) || DEFAULT_CARD_TEXT;
    const icon = getLogo(data);
    const startUrl = 'index.html?school=' + encodeURIComponent(slug) + '&view=mobile&pwa=1';
    const manifest = {
      id: './school-timer-' + slug,
      name: 'مؤقت الحصص - ' + name,
      short_name: 'مؤقت الحصص',
      start_url: startUrl,
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

  function applyDefaultMiddleCards(){
    if (isInstallPage) return;
    if (window.__schoolTimerCardsApplied) return;
    const rightEl = document.getElementById('schoolName');
    const leftEl = document.getElementById('visionText');
    if (rightEl && rightEl.closest && rightEl.closest('.middle-cards')) rightEl.textContent = DEFAULT_CARD_TEXT;
    if (leftEl && leftEl.closest && leftEl.closest('.middle-cards')) leftEl.textContent = DEFAULT_CARD_TEXT;
  }

  function applyIdentity(data){
    if (!data || data._school_slug !== slug || isNeutralSchool) return;
    identity = data;
    const schoolName = safeText(data.school_name);
    const logoUrl = getLogo(data);

    if (schoolName) {
      document.title = schoolName + ' - مؤقت الحصص';
      const nameEl = document.getElementById('schoolName');
      if (nameEl && !(nameEl.closest && nameEl.closest('.middle-cards'))) nameEl.textContent = schoolName;
      try { if (window.settings) window.settings.schoolName = schoolName; } catch (error) {}
    }

    applyDefaultMiddleCards();

    const logo = document.getElementById('schoolLogo');
    if (logo) {
      if (logoUrl) {
        logo.src = logoUrl;
        logo.style.display = '';
      } else {
        logo.removeAttribute('src');
        logo.style.display = 'none';
      }
    }

    if (logoUrl) setIconLinks(logoUrl);
    setDynamicManifest(data);
  }

  async function loadIdentity(){
    if (isNeutralSchool || identityLoading) return;
    identityLoading = true;

    try {
      hideDefaultLogoUntilReady();

      const cached = readCache();
      if (cached) applyIdentity(cached);
      else applyDefaultMiddleCards();

      const db = getClient();
      if (!db) return;

      const { data, error } = await db
        .from('schools')
        .select('school_name,school_slug,logo_url,app_icon_url,is_active,created_at')
        .eq('school_slug', slug)
        .maybeSingle();
      if (error || !data) return;
      const taggedData = { ...data, _school_slug: slug };
      if (hasIdentityChanged(cached, taggedData)) clearCurrentSchoolRuntimeCaches();
      writeCache(taggedData);
      applyIdentity(taggedData);
    } catch (error) {
    } finally {
      identityLoading = false;
    }
  }

  function reapplyIdentitySoon(){
    if (identity) applyIdentity(identity);
  }

  function start(){
    hideDefaultLogoUntilReady();
    applyDefaultMiddleCards();
    if (isNeutralSchool) return;
    loadIdentity();
    setTimeout(reapplyIdentitySoon, 700);
    setTimeout(reapplyIdentitySoon, 1400);
    setTimeout(reapplyIdentitySoon, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
