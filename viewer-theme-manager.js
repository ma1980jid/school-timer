(function(){
  if (window.__viewerThemeManagerLoaded) return;
  window.__viewerThemeManagerLoaded = true;

  const EVENT_PREFIX = '__GLOBAL_EVENT_THEME__:';
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

  function applyTheme(data){
    ensureStyle();
    const schoolTheme = String(data && data.schoolTheme || 'omani').trim() || 'omani';
    const event = data && data.event;
    const activeEvent = isActiveEvent(event) ? event : null;
    const effectiveTheme = activeEvent && activeEvent.theme ? activeEvent.theme : schoolTheme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-theme-effective', effectiveTheme);
    if (activeEvent && activeEvent.title) setRibbon(activeEvent.title);
    else setRibbon('');
  }

  async function loadTheme(){
    const db = getClient();
    if (!db) {
      const cached = readCache();
      if (cached) applyTheme(cached);
      return;
    }
    try {
      const [schoolResult, eventResult] = await Promise.all([
        db.from('schools').select('theme_style').eq('school_slug', schoolSlug).maybeSingle(),
        db.from('school_messages').select('message_text,created_at').eq('school_slug', schoolSlug).eq('is_active', true).like('message_text', EVENT_PREFIX + '%').order('created_at', { ascending:false }).limit(1)
      ]);
      let event = null;
      const row = eventResult.data && eventResult.data[0];
      if (row && row.message_text) {
        try { event = JSON.parse(String(row.message_text).slice(EVENT_PREFIX.length)); } catch (error) {}
      }
      const data = {
        schoolTheme: schoolResult.data && schoolResult.data.theme_style || 'omani',
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
