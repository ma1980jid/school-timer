(function(){
  if (window.__viewerThemeManagerLoaded) return;
  window.__viewerThemeManagerLoaded = true;

  const EVENT_PREFIX = '__GLOBAL_EVENT_THEME__:';
  const THEMES = ['omani','white','green','gold'];
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_effective_theme_' + schoolSlug;
  let client = null;

  function todayMuscat(){
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Muscat', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function normalizeTheme(theme){
    const value = String(theme || '').trim();
    return THEMES.includes(value) ? value : 'omani';
  }

  function isActiveEvent(event){
    if (!event || event.enabled === false) return false;
    const today = todayMuscat();
    const start = String(event.startDate || '').trim();
    const end = String(event.endDate || start).trim();
    if (!start) return false;
    return today >= start && today <= (end || start);
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function ensureStyle(){
    if (document.getElementById('viewerThemeManagerStyle')) return;
    const style = document.createElement('style');
    style.id = 'viewerThemeManagerStyle';
    style.textContent = `
      .theme-event-ribbon{position:absolute;top:1.15%;left:50%;transform:translateX(-50%);z-index:1000;direction:rtl;background:rgba(15,23,42,.76);color:#fff;border:1px solid rgba(248,231,176,.72);border-radius:999px;padding:6px 18px;font-family:Tahoma,Arial,sans-serif;font-size:clamp(11px,1.05vw,17px);font-weight:900;box-shadow:0 8px 24px rgba(15,23,42,.22);pointer-events:none;white-space:nowrap}
      @media(max-width:768px){.theme-event-ribbon{top:.8%;font-size:clamp(10px,2.8vw,15px);padding:5px 12px;max-width:82vw;overflow:hidden;text-overflow:ellipsis}}
      html[data-theme-effective="white"] .timer-app{filter:saturate(.96) brightness(1.02)}
      html[data-theme-effective="green"] .timer-app{filter:saturate(1.08) hue-rotate(2deg)}
      html[data-theme-effective="gold"] .timer-app{filter:saturate(1.08) sepia(.08)}
      html[data-theme-effective="omani"] .timer-app{filter:none}
    `;
    document.head.appendChild(style);
  }

  function writeCache(data){
    try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt:Date.now(), data })); } catch (error) {}
  }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.data) return null;
      return cached.data;
    } catch (error) { return null; }
  }

  function setRibbon(text){
    let ribbon = document.getElementById('themeEventRibbon');
    const clean = String(text || '').trim();
    if (!clean) {
      if (ribbon) ribbon.remove();
      return;
    }
    if (!ribbon) {
      const app = document.querySelector('.timer-app');
      if (!app) return;
      ribbon = document.createElement('div');
      ribbon.id = 'themeEventRibbon';
      ribbon.className = 'theme-event-ribbon';
      app.appendChild(ribbon);
    }
    ribbon.textContent = clean;
  }

  function computeAutoTheme(settings){
    if (!settings || !settings.autoThemeEnabled || settings.manualThemeLocked) return null;
    const startText = String(settings.autoThemeStartDate || todayMuscat()).slice(0, 10);
    const start = new Date(startText + 'T00:00:00+04:00').getTime();
    const now = new Date(todayMuscat() + 'T00:00:00+04:00').getTime();
    const days = Math.max(0, Math.floor((now - start) / 86400000));
    const interval = Math.max(1, Number(settings.autoThemeDays || 20));
    const sequence = Array.isArray(settings.autoThemeSequence) && settings.autoThemeSequence.length
      ? settings.autoThemeSequence.map(normalizeTheme)
      : THEMES;
    return normalizeTheme(sequence[Math.floor(days / interval) % sequence.length]);
  }

  function applyTheme(data){
    ensureStyle();
    const schoolTheme = normalizeTheme(data && data.schoolTheme || 'omani');
    const autoTheme = computeAutoTheme(data && data.themeSettings);
    const event = data && data.event;
    const activeEvent = isActiveEvent(event) ? event : null;
    const effectiveTheme = activeEvent && activeEvent.theme
      ? normalizeTheme(activeEvent.theme)
      : autoTheme || schoolTheme;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-theme-effective', effectiveTheme);
    document.documentElement.setAttribute('data-theme-source', activeEvent ? 'event' : autoTheme ? 'auto' : 'school');

    if (activeEvent && activeEvent.title) setRibbon(activeEvent.title);
    else setRibbon('');
  }

  function normalizeThemeSettings(row){
    if (!row) return null;
    let sequence = null;
    try {
      sequence = Array.isArray(row.auto_theme_sequence) ? row.auto_theme_sequence : JSON.parse(row.auto_theme_sequence || 'null');
    } catch (error) {}

    return {
      selectedTheme: normalizeTheme(row.selected_theme || row.default_theme || 'omani'),
      defaultTheme: normalizeTheme(row.default_theme || 'omani'),
      autoThemeEnabled: !!row.auto_theme_enabled,
      autoThemeDays: Number(row.auto_theme_days || 20),
      autoThemeStartDate: row.auto_theme_start_date || todayMuscat(),
      autoThemeSequence: Array.isArray(sequence) && sequence.length ? sequence : THEMES,
      manualThemeLocked: !!row.manual_theme_locked
    };
  }

  async function loadThemeSettings(db){
    try {
      const result = await db
        .from('school_theme_settings')
        .select('selected_theme,default_theme,auto_theme_enabled,auto_theme_days,auto_theme_start_date,auto_theme_sequence,manual_theme_locked,updated_at')
        .eq('school_slug', schoolSlug)
        .maybeSingle();
      if (!result.error && result.data) return normalizeThemeSettings(result.data);
    } catch (error) {}
    return null;
  }

  async function loadLegacyTheme(db){
    try {
      const schoolResult = await db.from('schools').select('theme_style').eq('school_slug', schoolSlug).maybeSingle();
      if (schoolResult.data && schoolResult.data.theme_style) return normalizeTheme(schoolResult.data.theme_style);
    } catch (error) {}
    return 'omani';
  }

  async function loadLegacyEvent(db){
    try {
      const eventResult = await db
        .from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', schoolSlug)
        .eq('is_active', true)
        .like('message_text', EVENT_PREFIX + '%')
        .order('created_at', { ascending:false })
        .limit(1);

      const row = eventResult.data && eventResult.data[0];
      if (row && row.message_text) return JSON.parse(String(row.message_text).slice(EVENT_PREFIX.length));
    } catch (error) {}
    return null;
  }

  async function loadTheme(){
    const db = getClient();
    if (!db) {
      const cached = readCache();
      if (cached) applyTheme(cached);
      return;
    }
    try {
      const [themeSettings, event] = await Promise.all([
        loadThemeSettings(db),
        loadLegacyEvent(db)
      ]);
      const legacyTheme = themeSettings ? null : await loadLegacyTheme(db);
      const data = {
        schoolTheme: themeSettings ? themeSettings.selectedTheme : legacyTheme,
        themeSettings,
        event
      };
      writeCache(data);
      applyTheme(data);
    } catch (error) {
      const cached = readCache();
      if (cached) applyTheme(cached);
    }
  }

  function start(){
    const cached = readCache();
    if (cached) applyTheme(cached);
    loadTheme();
    setInterval(loadTheme, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
