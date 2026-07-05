(function(){
  if (window.__viewerMultischoolIdentityLoaded) return;
  window.__viewerMultischoolIdentityLoaded = true;

  const urlParams = new URLSearchParams(location.search);
  const slug = urlParams.get('school') || window.SCHOOL_TIMER_SLUG || '__neutral__';
  const isNeutralSchool = slug === '__neutral__';
  const cacheKey = 'school_timer_identity_' + slug;
  const pwaIconCacheKey = 'school_timer_pwa_icon_' + slug;
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

  function fallbackManifestIcons(appBase){
    return [
      { src: new URL('icons/pwa-192.png', appBase).href, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: new URL('icons/pwa-512.png', appBase).href, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ];
  }

  function buildManifestIcons(iconData, appBase){
    if (!iconData || !iconData.src || Number(iconData.size || 0) < 192) return fallbackManifestIcons(appBase);
    const fallback = fallbackManifestIcons(appBase);
    return [
      { src: iconData.src, sizes: '192x192', type: 'image/png', purpose: 'any' },
      Number(iconData.size || 0) >= 512
        ? { src: iconData.src, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        : fallback[1]
    ];
  }

  function updateManifestWithIcon(iconData){
    if (isNeutralSchool) return;
    try {
      const appBase = new URL('./', location.href);
      const startUrl = new URL('index.html', appBase);
      startUrl.searchParams.set('school', slug);
      startUrl.searchParams.set('view', 'mobile');
      startUrl.searchParams.set('pwa', '1');

      const manifest = {
        id: new URL('school-timer-' + encodeURIComponent(slug), appBase).href,
        name: 'مؤقت الحصص',
        short_name: 'مؤقت الحصص',
        start_url: startUrl.href,
        scope: appBase.href,
        display: 'standalone',
        background_color: '#f8f2e8',
        theme_color: '#0f766e',
        dir: 'rtl',
        lang: 'ar',
        icons: buildManifestIcons(iconData, appBase)
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      let link = document.getElementById('schoolTimerManifest') || document.querySelector('link[rel="manifest"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        link.id = 'schoolTimerManifest';
        document.head.appendChild(link);
      }
      link.href = URL.createObjectURL(blob);
    } catch (error) {}
  }

  function validatePwaIcon(url){
    const src = safeText(url);
    if (!src) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = Number(img.naturalWidth || 0);
        const height = Number(img.naturalHeight || 0);
        const diff = Math.abs(width - height);
        const tolerance = Math.max(2, Math.round(Math.max(width, height) * 0.02));
        if (width >= 192 && height >= 192 && diff <= tolerance) resolve({ src, width, height, size: Math.min(width, height), _school_slug: slug });
        else resolve(null);
      };
      img.onerror = () => resolve(null);
      img.decoding = 'async';
      img.src = src;
    });
  }

  async function updatePwaIconFromIdentity(data){
    if (isNeutralSchool || !data) return;
    const candidates = [safeText(data.app_icon_url), safeText(data.logo_url)].filter(Boolean);
    for (const candidate of candidates) {
      const valid = await validatePwaIcon(candidate);
      if (valid) {
        try { localStorage.setItem(pwaIconCacheKey, JSON.stringify(valid)); } catch (error) {}
        updateManifestWithIcon(valid);
        return;
      }
    }
    try { localStorage.removeItem(pwaIconCacheKey); } catch (error) {}
    updateManifestWithIcon(null);
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
    updatePwaIconFromIdentity(data);
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