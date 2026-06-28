(function(){
  if (window.__viewerAutoThemeLoaded) return;
  window.__viewerAutoThemeLoaded = true;

  const AUTO_PREFIX = '__AUTO_THEME__:';
  const EVENT_PREFIX = '__GLOBAL_EVENT_THEME__:';
  const THEMES = ['omani','white','green','gold'];
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_auto_theme_' + schoolSlug;
  let client = null;
  let applying = false;

  function todayKey(){
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Muscat', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function isActiveEvent(event){
    if (!event || event.enabled === false) return false;
    const today = todayKey();
    const start = String(event.startDate || '').trim();
    const end = String(event.endDate || start).trim();
    if (!start) return false;
    return today >= start && today <= (end || start);
  }

  function normalizeTheme(theme){
    const value = String(theme || '').trim();
    return THEMES.includes(value) ? value : 'omani';
  }

  function computeAutoTheme(config){
    if (!config || !config.enabled) return null;
    const start = new Date(String(config.startDate || todayKey()) + 'T00:00:00+04:00').getTime();
    const now = new Date(todayKey() + 'T00:00:00+04:00').getTime();
    const days = Math.max(0, Math.floor((now - start) / 86400000));
    const interval = Math.max(1, Number(config.intervalDays || 20));
    const sequence = Array.isArray(config.sequence) && config.sequence.length ? config.sequence.map(normalizeTheme) : THEMES;
    return normalizeTheme(sequence[Math.floor(days / interval) % sequence.length]);
  }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.data) return null;
      return cached.data;
    } catch (error) { return null; }
  }

  function writeCache(data){
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt:Date.now(), data })); } catch (error) {}
  }

  function readThemeManagerCache(){
    try {
      const cached = JSON.parse(localStorage.getItem('school_timer_effective_theme_' + schoolSlug) || 'null');
      return cached && cached.data ? cached.data : null;
    } catch (error) { return null; }
  }

  function applyAuto(data){
    const themeManagerData = readThemeManagerCache();
    const event = data && data.event || themeManagerData && themeManagerData.event;
    if (isActiveEvent(event)) return;

    const nextTheme = computeAutoTheme(data && data.auto);
    if (!nextTheme) return;

    applying = true;
    document.documentElement.setAttribute('data-theme-effective', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.setAttribute('data-auto-theme', 'true');
    setTimeout(() => { applying = false; }, 60);
  }

  async function loadAutoTheme(){
    const db = getClient();
    if (!db) {
      const cached = readCache();
      if (cached) applyAuto(cached);
      return;
    }
    try {
      const [autoResult, eventResult] = await Promise.all([
        db.from('school_messages').select('message_text,created_at').eq('school_slug', schoolSlug).eq('is_active', true).like('message_text', AUTO_PREFIX + '%').order('created_at', { ascending:false }).limit(1),
        db.from('school_messages').select('message_text,created_at').eq('school_slug', schoolSlug).eq('is_active', true).like('message_text', EVENT_PREFIX + '%').order('created_at', { ascending:false }).limit(1)
      ]);

      let auto = null;
      let event = null;
      const autoRow = autoResult.data && autoResult.data[0];
      const eventRow = eventResult.data && eventResult.data[0];
      if (autoRow && autoRow.message_text) {
        try { auto = JSON.parse(String(autoRow.message_text).slice(AUTO_PREFIX.length)); } catch (error) {}
      }
      if (eventRow && eventRow.message_text) {
        try { event = JSON.parse(String(eventRow.message_text).slice(EVENT_PREFIX.length)); } catch (error) {}
      }
      const data = { auto, event };
      writeCache(data);
      applyAuto(data);
    } catch (error) {
      const cached = readCache();
      if (cached) applyAuto(cached);
    }
  }

  function start(){
    const cached = readCache();
    if (cached) applyAuto(cached);
    setTimeout(loadAutoTheme, 1600);
    setInterval(loadAutoTheme, 10 * 60 * 1000);

    if (window.MutationObserver) {
      const observer = new MutationObserver(() => {
        if (applying) return;
        const cachedData = readCache();
        if (cachedData) setTimeout(() => applyAuto(cachedData), 80);
      });
      observer.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme-effective','data-theme'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
