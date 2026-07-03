(function(){
  'use strict';

  const DEFAULT_TEXT = 'مؤقت الحصص';
  const SCHEDULE_PREFIX = '__SCHEDULE_ROWS__:';
  const RIGHT_PREFIX = '__CARD_RIGHT__:';
  const LEFT_PREFIX = '__CARD_LEFT__:';
  const SYSTEM_PREFIXES = ['__CARD_', '__SCHEDULED__:', '__SCHEDULE_ROWS__:', '__ALERT_SETTINGS__:', '__GLOBAL_EVENT_THEME__:', '__AUTO_THEME__:'];
  const params = new URLSearchParams(location.search);
  const slug = cleanSlug(params.get('school'));
  const view = params.get('view') || 'mobile';
  let client = null;
  let school = null;
  let scheduleRows = [];
  let messages = [DEFAULT_TEXT];
  let cards = { right: DEFAULT_TEXT, left: DEFAULT_TEXT };
  let lastTableSignature = '';
  let lastTickerSignature = '';

  function $(id){ return document.getElementById(id); }
  function text(id, value){ const el = $(id); if (el && el.textContent !== String(value)) el.textContent = String(value); }
  function cleanSlug(value){ return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/\-+/g, '-').replace(/^\-+|\-+$/g, ''); }
  function safe(value){ return String(value == null ? '' : value).trim(); }
  function isSystemMessage(value){ const t = safe(value); return SYSTEM_PREFIXES.some((p) => t.startsWith(p)); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function toMinutes(value){ const parts = safe(value).split(':').map(Number); return parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) ? NaN : parts[0] * 60 + parts[1]; }
  function timeText(minutes){ minutes = (minutes % 1440 + 1440) % 1440; return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60); }
  function rangeText(row){ return row ? timeText(row.startMinutes) + ' - ' + timeText(row.endMinutes) : '--'; }
  function duration(sec){ sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60; return h ? pad(h) + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s); }
  function unique(list){ const seen = new Set(); return list.map(safe).filter(Boolean).filter((x) => { if (seen.has(x)) return false; seen.add(x); return true; }); }

  function showError(message, code){
    const app = $('app'), box = $('errorBox');
    if (app) app.hidden = true;
    if (box) box.hidden = false;
    text('errorText', message);
    text('errorCode', code || location.href);
  }

  function showApp(){
    const app = $('app'), box = $('errorBox');
    if (box) box.hidden = true;
    if (app) app.hidden = false;
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function muscatParts(){
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Muscat', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).formatToParts(new Date());
    const out = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return { h:+out.hour, m:+out.minute, s:+out.second };
  }

  function todayKey(){
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Muscat', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const out = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return out.year + '-' + out.month + '-' + out.day;
  }

  function renderDate(){
    const now = new Date();
    try {
      text('weekday', new Intl.DateTimeFormat('ar-OM-u-ca-gregory', { timeZone:'Asia/Muscat', weekday:'long' }).format(now));
      text('gregorianDate', new Intl.DateTimeFormat('ar-OM-u-ca-gregory', { timeZone:'Asia/Muscat', day:'numeric', month:'long', year:'numeric' }).format(now));
      text('hijriDate', new Intl.DateTimeFormat('ar-OM-u-ca-islamic-umalqura', { timeZone:'Asia/Muscat', day:'numeric', month:'long', year:'numeric' }).format(now));
    } catch(error) {}
  }

  function renderClock(){
    const t = muscatParts();
    text('digitalClock', pad(t.h) + ':' + pad(t.m) + ':' + pad(t.s));
  }

  function setTheme(data){
    const root = document.documentElement;
    const primary = safe(data.primary_color || data.primaryColor);
    const bg = safe(data.background_color || data.backgroundColor);
    if (primary) root.style.setProperty('--green', primary);
    if (bg) root.style.setProperty('--bg', bg);
  }

  function applySchool(data){
    school = data;
    const name = safe(data.school_name) || DEFAULT_TEXT;
    const logo = safe(data.app_icon_url || data.logo_url);
    document.title = name + ' - مؤقت الحصص';
    text('schoolName', name);
    text('loadStatus', 'تم تحميل بيانات المدرسة');
    setTheme(data);
    const img = $('schoolLogo');
    if (img && logo) {
      img.src = logo;
      document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => link.href = logo);
    }
  }

  async function loadSchool(){
    const db = getClient();
    const { data, error } = await db.from('schools').select('school_name,school_slug,logo_url,app_icon_url,is_active,primary_color,background_color').eq('school_slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('لم يتم العثور على المدرسة في قاعدة البيانات.');
    if (data.is_active === false) throw new Error('هذه المدرسة غير مفعلة حاليًا.');
    applySchool(data);
  }

  function normalizeRow(row, index){
    const name = safe(row.name || row.period_name || row.title || row.label || row.period || row.periodTitle);
    const start = safe(row.start || row.start_time || row.from_time || row.from || row.startTime);
    const end = safe(row.end || row.end_time || row.to_time || row.to || row.endTime);
    const sm = toMinutes(start), emRaw = toMinutes(end);
    if (!name || !Number.isFinite(sm) || !Number.isFinite(emRaw)) return null;
    const em = emRaw <= sm ? emRaw + 1440 : emRaw;
    const durationText = safe(row.duration || row.minutes || row.period_duration || row.duration_minutes);
    const order = Number(row.order_index ?? row.sort_order ?? row.order ?? index);
    return { name, start, end, startMinutes:sm, endMinutes:em, duration:durationText, order:Number.isFinite(order) ? order : index };
  }

  function normalizeRows(rows){
    return (Array.isArray(rows) ? rows : []).map(normalizeRow).filter(Boolean).sort((a,b) => a.order - b.order || a.startMinutes - b.startMinutes);
  }

  async function loadScheduleFromMessage(){
    const db = getClient();
    const { data, error } = await db.from('school_messages').select('message_text,created_at').eq('school_slug', slug).eq('is_active', true).like('message_text', SCHEDULE_PREFIX + '%').order('created_at', { ascending:false }).limit(1);
    if (error) return [];
    const textValue = safe(data && data[0] && data[0].message_text);
    if (!textValue) return [];
    try {
      const parsed = JSON.parse(textValue.slice(SCHEDULE_PREFIX.length));
      return normalizeRows(parsed.rows || parsed);
    } catch(error) { return []; }
  }

  async function loadScheduleFromTable(){
    const db = getClient();
    try {
      const { data, error } = await db.from('school_schedule_rows').select('*').eq('school_slug', slug);
      if (error) return [];
      return normalizeRows(data || []);
    } catch(error) { return []; }
  }

  async function loadSchedule(){
    const fromMessage = await loadScheduleFromMessage();
    scheduleRows = fromMessage.length ? fromMessage : await loadScheduleFromTable();
    if (!scheduleRows.length) text('loadStatus', 'لم يتم العثور على جدول توقيت مفعل لهذه المدرسة');
    lastTableSignature = '';
    renderAll();
  }

  function isActiveDisplayMessage(row){
    if (!row || row.is_active === false) return false;
    const today = todayKey();
    let start = safe(row.start_date), end = safe(row.end_date);
    if (!start && !end) return true;
    if (!start) start = end;
    if (!end) end = start;
    if (row.is_annual) {
      const y = today.slice(0,4);
      start = y + start.slice(4);
      end = y + end.slice(4);
    }
    return today >= start && today <= end;
  }

  function parseCardsFromSchoolMessages(rows){
    const out = {};
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const t = safe(row.message_text);
      if (t.startsWith(RIGHT_PREFIX)) out.right = safe(t.slice(RIGHT_PREFIX.length));
      if (t.startsWith(LEFT_PREFIX)) out.left = safe(t.slice(LEFT_PREFIX.length));
    });
    return out;
  }

  async function loadMessages(){
    const db = getClient();
    const ticker = [];
    let cardRows = [];

    try {
      const { data } = await db.from('school_display_messages').select('message_text,target_area,sort_order,is_active,start_date,end_date,is_annual').eq('school_slug', slug);
      (data || []).filter(isActiveDisplayMessage).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((row) => {
        const target = safe(row.target_area || 'ticker');
        const msg = safe(row.message_text);
        if (msg && !isSystemMessage(msg) && (target === 'ticker' || target === 'all' || !target)) ticker.push(msg);
      });
    } catch(error) {}

    try {
      const { data } = await db.from('school_messages').select('message_text,is_active,sort_order,created_at').eq('school_slug', slug).eq('is_active', true);
      cardRows = data || [];
      (data || []).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((row) => {
        const msg = safe(row.message_text);
        if (msg && !isSystemMessage(msg)) ticker.push(msg);
      });
    } catch(error) {}

    cards = Object.assign({ right:DEFAULT_TEXT, left:DEFAULT_TEXT }, parseCardsFromSchoolMessages(cardRows));
    messages = unique(ticker).length ? unique(ticker) : [DEFAULT_TEXT];
    renderCards();
    renderTicker();
  }

  function currentState(){
    const now = muscatParts();
    const nowMinutes = now.h * 60 + now.m;
    const nowSeconds = now.h * 3600 + now.m * 60 + now.s;
    const current = scheduleRows.find((x) => nowMinutes >= x.startMinutes && nowMinutes < x.endMinutes);
    const previous = [...scheduleRows].reverse().find((x) => x.endMinutes <= nowMinutes);
    const next = scheduleRows.find((x) => x.startMinutes > nowMinutes);
    return { now, nowMinutes, nowSeconds, current, previous, next, first:scheduleRows[0] };
  }

  function setPeriod(prefix, row){
    text(prefix + 'Name', row ? row.name : '--');
    const el = $(prefix + 'Time');
    if (el) el.textContent = row ? rangeText(row) : '--';
  }

  function renderCards(){
    text('rightCard', safe(cards.right) || DEFAULT_TEXT);
    text('leftCard', safe(cards.left) || DEFAULT_TEXT);
  }

  function renderTopCards(){
    const s = currentState();
    setPeriod('previous', s.previous);
    setPeriod('next', s.next);
    if (s.current) setPeriod('current', s.current);
    else if (s.first && s.nowMinutes < s.first.startMinutes) { text('currentName', '--'); text('currentTime', '--'); }
    else if (s.next) { text('currentName', 'الحصة\nالخالية'); text('currentTime', rangeText(s.next)); }
    else { text('currentName', 'انتهى\nالدوام'); text('currentTime', '--'); }

    if (s.current) { text('countLabel', 'متبقي من الحصة الحالية'); text('remainingTime', duration(s.current.endMinutes * 60 - s.nowSeconds)); }
    else if (s.first && s.nowMinutes < s.first.startMinutes) { text('countLabel', 'متبقي على بداية الدوام'); text('remainingTime', duration(s.first.startMinutes * 60 - s.nowSeconds)); }
    else if (s.next) { text('countLabel', 'متبقي على الحصة القادمة'); text('remainingTime', duration(s.next.startMinutes * 60 - s.nowSeconds)); }
    else { text('countLabel', 'انتهى اليوم الدراسي'); text('remainingTime', '00:00'); }
  }

  function rowEl(row, status){
    const div = document.createElement('div');
    div.className = 'row' + (status === 'جارية' ? ' current' : '');
    const name = document.createElement('div'); name.textContent = row.name;
    const time = document.createElement('div'); time.className = 'time'; time.textContent = rangeText(row);
    const st = document.createElement('div'); st.className = 'status'; st.textContent = status;
    if (row.duration) { const d = document.createElement('span'); d.className = 'duration'; d.textContent = row.duration + ' د'; st.appendChild(d); }
    div.append(name, time, st);
    return div;
  }

  function renderTable(){
    const c1 = $('scheduleCol1'), c2 = $('scheduleCol2');
    if (!c1 || !c2) return;
    const s = currentState();
    const signature = scheduleRows.map((row) => {
      const status = s.current === row ? 'جارية' : s.nowMinutes >= row.endMinutes ? 'انتهت' : 'قادمة';
      return row.name + '|' + row.start + '|' + row.end + '|' + status;
    }).join('||');
    if (signature === lastTableSignature) return;
    lastTableSignature = signature;
    const half = Math.ceil(scheduleRows.length / 2);
    const left = scheduleRows.slice(0, half);
    const right = scheduleRows.slice(half);
    c1.replaceChildren(...left.map((row) => rowEl(row, s.current === row ? 'جارية' : s.nowMinutes >= row.endMinutes ? 'انتهت' : 'قادمة')));
    c2.replaceChildren(...right.map((row) => rowEl(row, s.current === row ? 'جارية' : s.nowMinutes >= row.endMinutes ? 'انتهت' : 'قادمة')));
  }

  function renderTicker(){
    const track = $('tickerTrack');
    if (!track) return;
    const list = messages.length ? messages : [DEFAULT_TEXT];
    const signature = list.join('||');
    if (signature === lastTickerSignature && track.children.length) return;
    lastTickerSignature = signature;
    const items = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      list.forEach((msg) => { const span = document.createElement('span'); span.className = 'ticker-item'; span.textContent = msg; items.push(span); });
    }
    track.replaceChildren(...items);
    const durationValue = Math.max(22, list.join(' ').length / 4);
    track.style.setProperty('--ticker-duration', durationValue + 's');
  }

  function renderAll(){
    renderClock();
    renderDate();
    renderTopCards();
    renderTable();
    renderCards();
    renderTicker();
  }

  async function refreshData(){
    await Promise.all([loadSchedule(), loadMessages()]);
  }

  async function start(){
    if (!slug) {
      showError('رابط المدرسة غير محدد. افتح الصفحة من رابط يحتوي على school.', 'مثال: viewer-clean.html?school=school-slug&view=' + view);
      return;
    }
    const db = getClient();
    if (!db) {
      showError('تعذر الاتصال بإعدادات Supabase. تأكد من تحميل ملفات الموقع.', location.href);
      return;
    }
    try {
      showApp();
      text('loadStatus', 'تحميل بيانات المدرسة: ' + slug);
      await loadSchool();
      await refreshData();
      setInterval(renderAll, 1000);
      setInterval(refreshData, 15000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshData(); });
      window.addEventListener('focus', refreshData);
    } catch(error) {
      showError(error.message || 'تعذر تحميل بيانات المدرسة.', slug);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
