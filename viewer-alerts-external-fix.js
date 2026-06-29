(function(){
  if (window.__viewerAlertsExternalFixLoaded) return;
  window.__viewerAlertsExternalFixLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const DEFAULT_SETTINGS = {
    enabled: false,
    beforeEndEnabled: true,
    endEnabled: true,
    phoneNotificationEnabled: true,
    beforeEndMinutes: 5
  };

  let settings = { ...DEFAULT_SETTINGS };
  let notifiedBefore = '';
  let notifiedEnd = '';
  let lastCurrent = '';
  let lastCurrentName = '';
  let client = null;

  function db(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function boolValue(value, fallback){
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'enabled'].includes(text)) return true;
    if (['false', '0', 'no', 'off', 'disabled'].includes(text)) return false;
    return fallback;
  }

  function numberValue(value, fallback){
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function normalizeSettings(row){
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
      enabled: boolValue(row.enabled ?? row.is_enabled ?? row.alerts_enabled ?? row.notification_enabled, DEFAULT_SETTINGS.enabled),
      beforeEndEnabled: boolValue(row.before_end_enabled ?? row.beforeEndEnabled ?? row.before_end_alert_enabled, DEFAULT_SETTINGS.beforeEndEnabled),
      endEnabled: boolValue(row.end_enabled ?? row.endEnabled ?? row.end_alert_enabled, DEFAULT_SETTINGS.endEnabled),
      phoneNotificationEnabled: boolValue(row.phone_notification_enabled ?? row.phoneNotificationEnabled, DEFAULT_SETTINGS.phoneNotificationEnabled),
      beforeEndMinutes: numberValue(row.before_end_minutes ?? row.beforeEndMinutes ?? row.minutes_before_end, DEFAULT_SETTINGS.beforeEndMinutes)
    };
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
      const { data, error } = await c
        .from('school_alert_settings')
        .select('*')
        .eq('school_slug', slug)
        .maybeSingle();

      if (error) return;
      settings = normalizeSettings(data);
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

  function check(){
    if (!settings.enabled || typeof window.getSchedule !== 'function') return;
    const schedule = window.getSchedule();
    const current = schedule && schedule.current;
    const key = periodKey(current);
    const remaining = remainingSeconds(schedule);
    const beforeEndSeconds = Math.max(1, settings.beforeEndMinutes) * 60;

    if (current && key) {
      lastCurrent = key;
      lastCurrentName = current.name || '';
      if (settings.beforeEndEnabled && remaining !== null && remaining <= beforeEndSeconds && remaining > 0 && notifiedBefore !== key) {
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
