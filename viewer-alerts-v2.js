(function(){
  if (window.__viewerAlertsV2Loaded) return;
  window.__viewerAlertsV2Loaded = true;

  const PREFIX = '__ALERT_SETTINGS__:';
  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  let cfg = {
    enabled: false,
    beforeEndEnabled: true,
    beforeEndMinutes: 5,
    endEnabled: true,
    phoneNotificationEnabled: true,
    screenAlertEnabled: true,
    soundEnabled: false,
    soundUrl: ''
  };
  let warned = '';
  let ended = '';
  let lastKey = '';
  let client = null;
  let activeToast = null;
  let activeToastKey = '';
  let activeType = '';

  function db(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function key(p){ return p ? `${p.name}|${p.start}|${p.end}` : ''; }

  function remain(s){
    if (!s || !s.current || !s.time) return null;
    const h = s.time.hour ?? s.time.h;
    const m = s.time.minute ?? s.time.m;
    const sec = s.time.second ?? s.time.s;
    return Math.floor(s.current.endMinutes * 60 - (h * 3600 + m * 60 + sec));
  }

  function style(){
    if (document.getElementById('viewerAlertsStyle')) return;
    const x = document.createElement('style');
    x.id = 'viewerAlertsStyle';
    x.textContent = '.viewer-alert-toast{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999999;direction:rtl;min-width:min(92vw,520px);max-width:92vw;background:linear-gradient(135deg,#0f172a,#0f766e);color:#fff;border-radius:24px;padding:26px 28px;box-shadow:0 24px 60px rgba(15,23,42,.42);font-family:Tahoma,Arial,sans-serif;text-align:center;border:3px solid rgba(248,231,176,.65)}.viewer-alert-toast strong{display:block;font-size:clamp(28px,5.2vw,44px);margin-bottom:12px;color:#f8e7b0;line-height:1.25}.viewer-alert-toast span{display:block;font-size:clamp(22px,4.3vw,34px);font-weight:900;line-height:1.55}.viewer-alert-enable{position:fixed;right:16px;bottom:16px;z-index:999998;border:0;border-radius:14px;background:#0f172a;color:#fff;padding:11px 14px;font-family:Tahoma,Arial,sans-serif;font-weight:900;box-shadow:0 10px 24px rgba(15,23,42,.24)}';
    document.head.appendChild(x);
  }

  function toast(t, b, k, type){
    if (!cfg.screenAlertEnabled) return;
    style();
    if (!activeToast || activeToastKey !== k || activeType !== type) {
      document.querySelectorAll('.viewer-alert-toast').forEach((e) => e.remove());
      activeToast = document.createElement('div');
      activeToast.className = 'viewer-alert-toast';
      activeToast.innerHTML = '<strong></strong><span></span>';
      document.body.appendChild(activeToast);
      activeToastKey = k;
      activeType = type;
    }
    activeToast.querySelector('strong').textContent = t;
    activeToast.querySelector('span').textContent = b;
    if (type === 'end') {
      setTimeout(() => {
        if (activeToast && activeToastKey === k) {
          activeToast.remove();
          activeToast = null;
          activeToastKey = '';
          activeType = '';
        }
      }, 10000);
    }
  }

  function closeToast(k){
    if (activeToast && (!k || activeToastKey === k)) {
      activeToast.remove();
      activeToast = null;
      activeToastKey = '';
      activeType = '';
    }
  }

  function tone(c, f, d){
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(.001, c.currentTime + d);
      g.gain.exponentialRampToValueAtTime(.26, c.currentTime + d + .03);
      g.gain.exponentialRampToValueAtTime(.001, c.currentTime + d + .38);
      o.connect(g);
      g.connect(c.destination);
      o.start(c.currentTime + d);
      o.stop(c.currentTime + d + .42);
    } catch (e) {}
  }

  function beep(){
    if (!cfg.soundEnabled) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      const c = new C();
      tone(c, 880, 0);
      tone(c, 1040, .18);
      tone(c, 880, .36);
      if (navigator.vibrate) navigator.vibrate([260,120,260]);
    } catch (e) {}
  }

  function note(t, b){
    if (!cfg.phoneNotificationEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(t, { body: b, tag: 'school-timer-alert', renotify: true, icon: 'icons/school_logo.png' }); }
    catch (e) {}
  }

  function beforeMessage(p, r){
    const min = Math.max(1, Math.ceil((r || 0) / 60));
    return `باقي من الحصة ${p && p.name ? p.name : 'الحالية'} ${min} د`;
  }

  function fireBefore(p, r, k){
    const t = 'مؤقت الحصص';
    const b = beforeMessage(p, r);
    toast(t, b, k, 'before');
    if (warned !== k) {
      warned = k;
      note(t, b);
      beep();
    }
  }

  function fireEnd(p, k){
    const n = p && p.name ? p.name : 'الحصة';
    const t = 'مؤقت الحصص';
    const b = `انتهت الحصة ${n}`;
    toast(t, b, k, 'end');
    if (ended !== k) {
      ended = k;
      note(t, b);
      beep();
    }
  }

  function permission(){
    if (!cfg.enabled || !cfg.phoneNotificationEnabled || !('Notification' in window) || Notification.permission !== 'default' || document.getElementById('enableViewerAlerts')) return;
    style();
    const b = document.createElement('button');
    b.id = 'enableViewerAlerts';
    b.className = 'viewer-alert-enable';
    b.textContent = 'تفعيل تنبيهات الهاتف';
    b.onclick = async () => {
      try { await Notification.requestPermission(); } catch(e) {}
      b.remove();
    };
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 20000);
  }

  function applyTableSettings(row){
    if (!row) return false;
    cfg = Object.assign(cfg, {
      enabled: !!row.enabled,
      beforeEndEnabled: row.before_end_enabled !== false,
      beforeEndMinutes: Number(row.before_end_minutes || 5),
      endEnabled: row.end_enabled !== false,
      phoneNotificationEnabled: row.phone_notification_enabled !== false,
      screenAlertEnabled: true,
      soundEnabled: !!row.sound_enabled,
      soundUrl: row.sound_url || ''
    });
    cfg.beforeEndMinutes = Math.max(1, Math.min(30, Number(cfg.beforeEndMinutes || 5)));
    permission();
    return true;
  }

  function applyLegacySettings(text){
    try {
      cfg = Object.assign(cfg, JSON.parse(String(text || '').slice(PREFIX.length)));
      cfg.beforeEndMinutes = Math.max(1, Math.min(30, Number(cfg.beforeEndMinutes || 5)));
      cfg.phoneNotificationEnabled = true;
      cfg.screenAlertEnabled = true;
      permission();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function load(){
    const c = db();
    if (!c) return;
    try {
      const tableResult = await c
        .from('school_alert_settings')
        .select('enabled,before_end_enabled,before_end_minutes,end_enabled,phone_notification_enabled,sound_enabled,sound_url,updated_at')
        .eq('school_slug', slug)
        .maybeSingle();

      if (!tableResult.error && tableResult.data) {
        applyTableSettings(tableResult.data);
        return;
      }
    } catch (e) {}

    try {
      const legacy = await c
        .from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', slug)
        .like('message_text', PREFIX + '%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (legacy.data && legacy.data[0]) applyLegacySettings(legacy.data[0].message_text);
    } catch (e) {}
  }

  function check(){
    if (!cfg.enabled || typeof window.getSchedule !== 'function') return;
    const s = window.getSchedule();
    const p = s && s.current;
    const k = key(p);
    const r = remain(s);
    if (p && k) {
      lastKey = k;
      const beforeSeconds = Math.max(1, Number(cfg.beforeEndMinutes || 5)) * 60;
      if (cfg.beforeEndEnabled && r !== null && r <= beforeSeconds && r > 1) {
        fireBefore(p, r, k);
      } else if (activeType === 'before' && activeToastKey === k) {
        closeToast(k);
      }
      if (cfg.endEnabled && r !== null && r <= 1) fireEnd(p, k);
      return;
    }
    if (cfg.endEnabled && lastKey && ended !== lastKey) fireEnd({ name: 'السابقة' }, lastKey);
  }

  function start(){
    style();
    load();
    setInterval(check, 1000);
    setInterval(load, 60000);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
