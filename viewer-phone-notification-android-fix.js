(function(){
  if (window.__viewerPhoneNotificationAndroidFixLoaded) return;
  window.__viewerPhoneNotificationAndroidFixLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  let client = null;
  let settings = {
    enabled: false,
    beforeEndEnabled: true,
    beforeEndMinutes: 5,
    endEnabled: true,
    phoneNotificationEnabled: true
  };
  let beforeSent = '';
  let endSent = '';
  let lastCurrentKey = '';
  let lastCurrentName = '';

  function db(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function key(period){
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
      const result = await c.from('school_alert_settings')
        .select('enabled,before_end_enabled,before_end_minutes,end_enabled,phone_notification_enabled,updated_at')
        .eq('school_slug', slug)
        .maybeSingle();
      if (!result.error && result.data) {
        settings = {
          enabled: !!result.data.enabled,
          beforeEndEnabled: result.data.before_end_enabled !== false,
          beforeEndMinutes: Math.max(1, Math.min(30, Number(result.data.before_end_minutes || 5))),
          endEnabled: result.data.end_enabled !== false,
          phoneNotificationEnabled: result.data.phone_notification_enabled !== false
        };
      }
    } catch (error) {}
  }

  async function showPhoneNotification(title, body, tag){
    if (!settings.enabled || !settings.phoneNotificationEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: body || '',
      tag: tag || 'school-timer-phone-alert',
      renotify: true,
      icon: 'icons/school_logo.png',
      badge: 'icons/school_logo.png',
      data: { url: location.href, school: slug, createdAt: Date.now() }
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return;
        }
      }
    } catch (error) {}

    try { new Notification(title, options); } catch (error) {}
  }

  function check(){
    if (!settings.enabled || !settings.phoneNotificationEnabled || typeof window.getSchedule !== 'function') return;
    const schedule = window.getSchedule();
    const current = schedule && schedule.current;
    const k = key(current);
    const remaining = remainingSeconds(schedule);

    if (current && k) {
      lastCurrentKey = k;
      lastCurrentName = current.name || '';
      const beforeSeconds = Math.max(1, Number(settings.beforeEndMinutes || 5)) * 60;

      if (settings.beforeEndEnabled && remaining !== null && remaining <= beforeSeconds && remaining > 0 && beforeSent !== k) {
        beforeSent = k;
        showPhoneNotification('مؤقت الحصص', `باقي ${Math.ceil(remaining / 60)} د من الحصة ${current.name}`, 'school-timer-before-' + k);
      }

      if (settings.endEnabled && remaining !== null && remaining <= 1 && endSent !== k) {
        endSent = k;
        showPhoneNotification('مؤقت الحصص', `انتهت الحصة ${current.name}`, 'school-timer-end-' + k);
      }
      return;
    }

    if (settings.endEnabled && lastCurrentKey && endSent !== lastCurrentKey) {
      endSent = lastCurrentKey;
      showPhoneNotification('مؤقت الحصص', lastCurrentName ? `انتهت الحصة ${lastCurrentName}` : 'انتهت الحصة', 'school-timer-end-' + lastCurrentKey);
    }
  }

  function start(){
    loadSettings();
    setInterval(loadSettings, 30000);
    setInterval(check, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
