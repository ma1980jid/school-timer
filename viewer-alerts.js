(function(){
  if (window.__viewerAlertsLoaded) return;
  window.__viewerAlertsLoaded = true;

  const PREFIX = '__ALERT_SETTINGS__:';
  const DEFAULTS = {
    enabled: false,
    beforeEndEnabled: true,
    beforeEndMinutes: 5,
    endEnabled: true,
    phoneNotificationEnabled: true,
    screenAlertEnabled: true,
    soundEnabled: false
  };
  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  let settings = { ...DEFAULTS };
  let warnedKey = '';
  let endedKey = '';
  let lastCurrentKey = '';
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

  function secondsRemaining(schedule){
    if (!schedule || !schedule.current || !schedule.time) return null;
    const nowSeconds = (schedule.time.hour ?? schedule.time.h) * 3600 + (schedule.time.minute ?? schedule.time.m) * 60 + (schedule.time.second ?? schedule.time.s);
    return Math.floor(schedule.current.endMinutes * 60 - nowSeconds);
  }

  function ensureStyle(){
    if (document.getElementById('viewerAlertsStyle')) return;
    const style = document.createElement('style');
    style.id = 'viewerAlertsStyle';
    style.textContent = `
      .viewer-alert-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:999999;direction:rtl;min-width:min(92vw,420px);max-width:92vw;background:linear-gradient(135deg,#0f172a,#0f766e);color:#fff;border-radius:18px;padding:16px 20px;box-shadow:0 18px 40px rgba(15,23,42,.34);font-family:Tahoma,Arial,sans-serif;text-align:center;border:2px solid rgba(255,255,255,.22)}
      .viewer-alert-toast strong{display:block;font-size:22px;margin-bottom:6px;color:#f8e7b0}
      .viewer-alert-toast span{display:block;font-size:18px;font-weight:900;line-height:1.6}
      .viewer-alert-enable{position:fixed;right:16px;bottom:16px;z-index:999998;border:0;border-radius:14px;background:#0f172a;color:#fff;padding:11px 14px;font-family:Tahoma,Arial,sans-serif;font-weight:900;box-shadow:0 10px 24px rgba(15,23,42,.24)}
    `;
    document.head.appendChild(style);
  }

  function showScreenAlert(title, message){
    if (!settings.screenAlertEnabled) return;
    ensureStyle();
    document.querySelectorAll('.viewer-alert-toast').forEach((el) => el.remove());
    const toast = document.createElement('div');
    toast.className = 'viewer-alert-toast';
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 10000);
  }

  function beep(){
    if (!settings.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch(error) {}
  }

  function notify(title, body){
    if (!settings.phoneNotificationEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, tag: 'school-timer-alert', renotify: true, icon: 'icons/school_logo.png' });
    } catch(error) {}
  }

  function fire(type, period){
    const name = period && period.name ? period.name : 'الحصة الحالية';
    if (type === 'before') {
      const minutes = Number(settings.beforeEndMinutes || 5);
      const title = 'تنبيه مؤقت الحصص';
      const message = `متبقي ${minutes} دقائق على نهاية ${name}`;
      showScreenAlert(title, message);
      notify(title, message);
      beep();
    } else {
      const title = 'انتهت الحصة';
      const message = `انتهت ${name}`;
      showScreenAlert(title, message);
      notify(title, message);
      beep();
    }
  }

  function addPermissionButton(){
    if (!settings.enabled || !settings.phoneNotificationEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    if (document.getElementById('enableViewerAlerts')) return;
    ensureStyle();
    const button = document.createElement('button');
    button.id = 'enableViewerAlerts';
    button.className = 'viewer-alert-enable';
    button.textContent = 'تفعيل تنبيهات الهاتف';
    button.onclick = async () => {
      try { await Notification.requestPermission(); } catch(error) {}
      button.remove();
    };
    document.body.appendChild(button);
    setTimeout(() => { if (button.parentElement) button.remove(); }, 20000);
  }

  async function loadSettings(){
    const c = db();
    if (!c) return;
    try {
      const result = await c.from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', slug)
        .eq('is_active', true)
        .like('message_text', PREFIX + '%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (result.data && result.data[0]) {
        settings = { ...DEFAULTS, ...JSON.parse(String(result.data[0].message_text).slice(PREFIX.length)) };
        addPermissionButton();
      }
    } catch(error) {}
  }

  function check(){
    if (!settings.enabled || typeof window.getSchedule !== 'function') return;
    const schedule = window.getSchedule();
    const current = schedule && schedule.current;
    const key = periodKey(current);
    const remaining = secondsRemaining(schedule);

    if (current && key) {
      lastCurrentKey = key;
      const beforeSeconds = Math.max(1, Number(settings.beforeEndMinutes || 5)) * 60;
      if (settings.beforeEndEnabled && remaining !== null && remaining <= beforeSeconds && remaining > 0 && warnedKey !== key) {
        warnedKey = key;
        fire('before', current);
      }
      if (settings.endEnabled && remaining !== null && remaining <= 1 && endedKey !== key) {
        endedKey = key;
        fire('end', current);
      }
      return;
    }

    if (settings.endEnabled && lastCurrentKey && endedKey !== lastCurrentKey) {
      endedKey = lastCurrentKey;
      fire('end', { name: 'الحصة السابقة' });
    }
  }

  function start(){
    ensureStyle();
    loadSettings();
    setInterval(check, 1000);
    setInterval(loadSettings, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
