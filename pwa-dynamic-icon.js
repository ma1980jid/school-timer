(function(){
  if (window.__schoolTimerPwaDynamicIconLoaded) return;
  window.__schoolTimerPwaDynamicIconLoaded = true;

  const DEFAULT_ICON = 'icons/pwa-512.png?v=brand-20260716-01';
  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const iconCacheKey = 'school_timer_app_icon_' + slug;

  function absoluteUrl(url){
    try { return new URL(url, location.href).href; }
    catch (error) { return DEFAULT_ICON; }
  }

  function setLink(rel, href, sizes){
    let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      document.head.appendChild(link);
    }
    link.href = href;
  }

  function setIcons(iconUrl){
    const href = absoluteUrl(iconUrl || DEFAULT_ICON);
    setLink('icon', href, '192x192');
    setLink('icon', href, '512x512');
    setLink('apple-touch-icon', href, '180x180');
    setLink('shortcut icon', href);
    createManifest(href);
  }

  function createManifest(iconUrl){
    try {
      const manifest = {
        name: 'مؤقت الحصص المدرسية',
        short_name: 'مؤقت الحصص',
        start_url: `${location.pathname}?school=${encodeURIComponent(slug)}&view=mobile`,
        scope: location.pathname.replace(/[^\/]*$/, ''),
        display: 'standalone',
        background_color: '#f8f2e8',
        theme_color: '#0f766e',
        dir: 'rtl',
        lang: 'ar',
        icons: [
          { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      };
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

  function readCachedIcon(){
    try {
      const cached = JSON.parse(localStorage.getItem(iconCacheKey) || 'null');
      if (cached && cached.url) return cached.url;
    } catch (error) {}
    return '';
  }

  function writeCachedIcon(url){
    try {
      localStorage.setItem(iconCacheKey, JSON.stringify({ url, savedAt: Date.now() }));
    } catch (error) {}
  }

  async function loadRemoteIcon(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return;
    try {
      const db = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
      const result = await db.from('schools').select('*').eq('school_slug', slug).limit(1);
      const school = result.data && result.data[0];
      if (!school) return;
      const icon = school.app_icon_url || school.logo_url || school.school_logo_url || school.school_logo || school.logo || '';
      if (icon) {
        writeCachedIcon(icon);
        setIcons(icon);
      }
    } catch (error) {}
  }

  setIcons(DEFAULT_ICON);
})();
