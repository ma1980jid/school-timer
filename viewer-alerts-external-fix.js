(function(){
  if (window.__viewerAlertsExternalFixLoaded) return;
  window.__viewerAlertsExternalFixLoaded = true;

  const PREFIX = '__ALERT_SETTINGS__:';
  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  let settings = { enabled: false, beforeEndEnabled: true, endEnabled: true, phoneNotificationEnabled: true, beforeEndMinutes: 5 };
  let notifiedBefore = '';
  let notifiedEnd = '';
  let lastCurrent = '';
  let lastCurrentName = '';
  let lastSeenCurrent = '';
  let client = null;

  function db(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function periodKey(period){
    return period ? `${period.name}|${period.start}|${period.end}` : '';
  }

  function remainingSeconds(schedule){
    if (!schedule || !schedule.current || !schedule.time) return null;
    const h = schedule.time.hour ?? schedule.time.h;
    const m = schedule.time.minute ?? schedule.time.m;
    const s = schedule.time.second ?? schedule.time.s;
    return Math.floor(schedule.current.endMinutes * 60 - (h * 3600 + m * 60 + s));
  }

  async function loadSettings(){
    const c = db();
    if (!c) return;
    try {
      const table = await c.from('school_alert_settings')
        .select('enabled,before_end_enabled,before_end_minutes,end_enabled,phone_notification_enabled')
        .eq('school_slug', slug)
        .maybeSingle();
      if (!table.error && table.data) {
        settings = {
          enabled: !!table.data.enabled,
          beforeEndEnabled: table.data.before_end_enabled !== false,
          beforeEndMinutes: Math.max(1, Math.min(30, Number(table.data.before_end_minutes || 5))),
          endEnabled: table.data.end_enabled !== false,
          phoneNotificationEnabled: table.data.phone_notification_enabled !== false
        };
        return;
      }
    } catch (error) {}

    try {
      const r = await c.from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', slug)
        .like('message_text', PREFIX + '%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (r.data && r.data[0]) {
        settings = Object.assign(settings, JSON.parse(String(r.data[0].message_text).slice(PREFIX.length)));
        settings.phoneNotificationEnabled = true;
      }
    } catch (error) {}
  }

  function ensurePermissionButton(){
    if (!settings.enabled || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (document.getElementById('enableViewerAlertsExternal')) return;

    const button = document.createElement('button');
    button.id = 'enableViewerAlertsExternal';
    button.textContent = 'تفعيل إشعار الهاتف';
    button.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:1000000;border:0;border-radius:14px;background:#0f766e;color:#fff;padding:11px 14px;font-family:Tahoma,Arial,sans-serif;font-weight:900;box-shadow:0 10px 24px rgba(15,23,42,.24)';
    button.onclick = async function(){
      try { await Notification.requestPermission(); } catch (error) {}
      button.remove();
    };
    document.body.appendChild(button);
    setTimeout(() => { if (button.parentElement) button.remove(); }, 25000);
  }

  function sendNotification(message){
    if (!settings.enabled || !settings.phoneNotificationEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      ensurePermissionButton();
      return;
    }
    try {
      new Notification(message, {
        body: '',
        tag: 'school-timer-phone-alert',
        renotify: true,
        icon: 'icons/school_logo.png',
        badge: 'icons/school_logo.png'
      });
    } catch (error) {}
  }

  function closeStaleScreenAlert(key){
    try {
      if (lastSeenCurrent && key && lastSeenCurrent !== key) {
        document.querySelectorAll('.viewer-alert-toast').forEach((el) => el.remove());
      }
      if (!key) {
        document.querySelectorAll('.viewer-alert-toast').forEach((el) => {
          if ((el.textContent || '').includes('باقي')) el.remove();
        });
      }
    } catch (error) {}
  }

  function check(){
    if (!settings.enabled || typeof window.getSchedule !== 'function') return;
    const schedule = window.getSchedule();
    const current = schedule && schedule.current;
    const key = periodKey(current);
    const remaining = remainingSeconds(schedule);

    closeStaleScreenAlert(key);

    if (current && key) {
      lastCurrent = key;
      lastCurrentName = current.name || '';
      lastSeenCurrent = key;
      const beforeSeconds = Math.max(1, Number(settings.beforeEndMinutes || 5)) * 60;
      if (settings.beforeEndEnabled && remaining !== null && remaining <= beforeSeconds && remaining > 0 && notifiedBefore !== key) {
        notifiedBefore = key;
        sendNotification(`باقي ${Math.ceil(remaining / 60)} د من الحصة ${current.name}`);
      }
      if (settings.endEnabled && remaining !== null && remaining <= 1 && notifiedEnd !== key) {
        notifiedEnd = key;
        sendNotification(`انتهت الحصة ${current.name}`);
      }
      return;
    }

    if (settings.endEnabled && lastCurrent && notifiedEnd !== lastCurrent) {
      notifiedEnd = lastCurrent;
      sendNotification(lastCurrentName ? `انتهت الحصة ${lastCurrentName}` : 'انتهت الحصة');
    }
  }

  function start(){
    loadSettings().then(ensurePermissionButton);
    setInterval(check, 1000);
    setInterval(() => loadSettings().then(ensurePermissionButton), 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
