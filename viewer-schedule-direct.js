(function(){
  if (window.__viewerScheduleDirectLoaded) return;
  window.__viewerScheduleDirectLoaded = true;

  const PREFIX = '__SCHEDULE_ROWS__:';
  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const CACHE_KEY = 'school_timer_direct_schedule_' + slug;
  const CACHE_TTL = 2 * 60 * 1000;
  const LOAD_INTERVAL = 10 * 1000;
  let rows = [];
  let sig = '';
  let loadTries = 0;
  let loading = false;

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.rows) || !cached.rows.length) return false;
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return false;
      rows = cached.rows;
      return true;
    } catch (error) { return false; }
  }

  function writeCache(nextRows){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rows: nextRows, savedAt: Date.now() })); }
    catch (error) {}
  }

  function clearCache(){
    try { localStorage.removeItem(CACHE_KEY); } catch (error) {}
  }

  function db(){
    return window.supabase && window.SCHOOL_TIMER_SUPABASE_URL && window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      ? window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY)
      : null;
  }

  function m(t){ const a = String(t || '').split(':').map(Number); return a.length < 2 ? NaN : a[0] * 60 + a[1]; }
  function pad(n){ return String(n).padStart(2, '0'); }
  function f(t){ t = (t % 1440 + 1440) % 1440; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function typ(x){ const s = (x.type || '') + ' ' + (x.name || ''); return s.includes('فسحة') ? 'break' : s.includes('صلاة') ? 'prayer' : s.includes('نشاط') ? 'activity' : 'normal'; }

  function list(){
    const items = rows.map((x) => {
      const sm = m(x.start), em = m(x.end);
      if (!x.name || !Number.isFinite(sm) || !Number.isFinite(em)) return null;
      return { name: x.name, start: x.start, end: x.end, duration: String(x.duration || '').trim(), startMinutes: sm, endMinutes: em <= sm ? em + 1440 : em, type: typ(x) };
    }).filter(Boolean);
    const c = Math.ceil(items.length / 2);
    return items.map((x, i) => Object.assign(x, { col: i < c ? 1 : 2 }));
  }

  function oman(){
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Muscat', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
    const out = {};
    parts.forEach((x) => out[x.type] = x.value);
    return { hour: +out.hour, minute: +out.minute, second: +out.second, h: +out.hour, m: +out.minute, s: +out.second };
  }

  function set(id, value){ const el = document.getElementById(id); if (el && el.textContent !== value) el.textContent = value; }
  function range(x){ return x ? f(x.endMinutes) + ' - ' + f(x.startMinutes) : '--'; }
  function time(id, x){ const el = document.getElementById(id); if (!el) return; const value = x === null ? '--' : range(x); if (el.textContent !== value) el.textContent = value; el.setAttribute('dir', 'ltr'); }
  function dur(sec){ sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), mi = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? pad(h) + ':' + pad(mi) + ':' + pad(s) : pad(mi) + ':' + pad(s); }
  function td(value, className){ const el = document.createElement('td'); if (className) el.className = className; el.textContent = value; return el; }

  function ensureDurationStyle(){
    if (document.getElementById('periodDurationStatusStyle')) return;
    const style = document.createElement('style');
    style.id = 'periodDurationStatusStyle';
    style.textContent = '.schedule-grid .status-cell{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;line-height:1.05!important}.schedule-grid .status-text{display:block!important}.schedule-grid .period-duration{display:block!important;font-size:1.05em!important;font-weight:900!important;color:#8a6a18!important;white-space:nowrap!important}.schedule-grid tr.current-row .period-duration{color:#7f1d1d!important}';
    document.head.appendChild(style);
  }

  function statusCell(status, x){
    ensureDurationStyle();
    const el = document.createElement('td');
    el.className = 'status-cell';
    const text = document.createElement('span');
    text.className = 'status-text';
    text.textContent = status;
    el.appendChild(text);
    if (x && x.duration) {
      const d = document.createElement('span');
      d.className = 'period-duration';
      d.textContent = x.duration + ' د';
      el.appendChild(d);
    }
    return el;
  }

  function tr(x, current, now){
    const status = current === x ? 'جارية' : now >= x.endMinutes ? 'انتهت' : 'قادمة';
    const row = document.createElement('tr');
    if (status === 'جارية') row.className = 'current-row';
    const t = td(range(x), 'time-cell');
    t.setAttribute('dir', 'ltr');
    row.append(td(x.name), t, statusCell(status, x));
    return row;
  }

  function schedule(){
    const items = list();
    const o = oman();
    const now = o.h * 60 + o.m;
    const current = items.find((x) => now >= x.startMinutes && now < x.endMinutes);
    const previous = [...items].reverse().find((x) => x.endMinutes <= now);
    const next = items.find((x) => x.startMinutes > now);
    return { list: items, current, previous, next, currentMinutes: now, time: o, now: new Date() };
  }

  function ensureNoStartStyle(){
    if (document.getElementById('noStartCurrentCardStyle')) return;
    const style = document.createElement('style');
    style.id = 'noStartCurrentCardStyle';
    style.textContent = '.current-card.not-started .period-name{font-size:inherit!important;line-height:inherit!important;white-space:nowrap!important;color:#c1121f!important}.current-card.not-started .period-time{display:flex!important;color:#c1121f!important}.current-card.not-started .period-line{margin-top:10px!important}';
    document.head.appendChild(style);
  }

  function markNoStart(on){ ensureNoStartStyle(); const card = document.querySelector('.current-card'); if (card) card.classList.toggle('not-started', !!on); }

  function renderTable(s = schedule()){
    const c1 = document.getElementById('scheduleCol1'), c2 = document.getElementById('scheduleCol2');
    if (!c1 || !c2 || !s.list.length) return;
    const nextSig = s.list.map((x) => (s.current === x ? 'جارية' : s.currentMinutes >= x.endMinutes ? 'انتهت' : 'قادمة') + '|' + x.name + '|' + x.start + '|' + x.end + '|' + x.duration).join('||');
    if (nextSig === sig) return;
    sig = nextSig;
    c1.replaceChildren(...s.list.filter((x) => x.col === 1).map((x) => tr(x, s.current, s.currentMinutes)));
    c2.replaceChildren(...s.list.filter((x) => x.col === 2).map((x) => tr(x, s.current, s.currentMinutes)));
  }

  function updateCards(s = schedule()){
    const first = s.list[0];
    set('previousName', s.previous ? s.previous.name : '--');
    time('previousTime', s.previous);
    set('nextName', s.next ? s.next.name : '--');
    time('nextTime', s.next);
    if (s.current) { markNoStart(false); set('currentName', s.current.name); time('currentTime', s.current); }
    else if (first && s.currentMinutes < first.startMinutes) { markNoStart(true); set('currentName', '--'); time('currentTime', null); }
    else if (s.next) { markNoStart(false); set('currentName', 'الحصة\nالخالية'); time('currentTime', s.next); }
    else { markNoStart(false); set('currentName', '--'); time('currentTime', null); }
  }

  function updateRemaining(s = schedule()){
    const first = s.list[0], sec = s.time.h * 3600 + s.time.m * 60 + s.time.s;
    if (s.current) { set('countLabel', 'متبقي من الحصة الحالية'); set('remainingTime', dur(s.current.endMinutes * 60 - sec)); }
    else if (first && s.currentMinutes < first.startMinutes) { set('countLabel', 'متبقي على بداية الدوام'); set('remainingTime', dur(first.startMinutes * 60 - sec)); }
    else if (s.next) { set('countLabel', 'متبقي على الحصة القادمة'); set('remainingTime', dur(s.next.startMinutes * 60 - sec)); }
    else { set('countLabel', 'انتهى اليوم الدراسي'); set('remainingTime', '00:00'); }
  }

  function paint(){ const s = schedule(); if (!s.list.length) return; updateCards(s); updateRemaining(s); renderTable(s); }
  function patch(){ window.getSchedule = schedule; window.updateCards = updateCards; window.updateRemaining = updateRemaining; window.renderTable = renderTable; window.getActivePeriods = list; }

  async function load(){
    if (loading) return;
    const client = db();
    if (!client) { if (loadTries++ < 20) setTimeout(load, 300); return; }
    loading = true;
    try {
      loadTries = 0;
      const result = await client.from('school_messages').select('message_text,created_at').eq('school_slug', slug).eq('is_active', true).like('message_text', PREFIX + '%').order('created_at', { ascending: false }).limit(1);
      if (result.data && result.data[0]) {
        const parsed = JSON.parse(String(result.data[0].message_text).slice(PREFIX.length));
        const nextRows = Array.isArray(parsed.rows) ? parsed.rows : [];
        const old = JSON.stringify(rows);
        rows = nextRows;
        writeCache(rows);
        if (JSON.stringify(rows) !== old) sig = '';
        patch();
        paint();
      } else if (!rows.length) {
        clearCache();
      }
    } catch (error) {
    } finally {
      loading = false;
    }
  }

  function start(){
    patch();
    if (readCache()) paint();
    load();
    setInterval(paint, 1000);
    setInterval(load, LOAD_INTERVAL);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
    window.addEventListener('focus', load);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
