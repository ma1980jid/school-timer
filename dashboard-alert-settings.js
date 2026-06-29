(function(){
  if (window.__dashboardAlertSettingsLoaded) return;
  window.__dashboardAlertSettingsLoaded = true;

  const PREFIX = '__ALERT_SETTINGS__:';
  const DEFAULTS = {
    enabled: false,
    beforeEndEnabled: true,
    beforeEndMinutes: 5,
    endEnabled: true,
    phoneNotificationEnabled: true,
    screenAlertEnabled: true,
    soundEnabled: false,
    soundUrl: ''
  };

  function slug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function db(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__alertSettingsClient) {
      window.__alertSettingsClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__alertSettingsClient;
  }

  function css(){
    if (document.getElementById('alertSettingsStyle')) return;
    const style = document.createElement('style');
    style.id = 'alertSettingsStyle';
    style.textContent = `
      .alert-settings-dialog{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl}
      .alert-settings-box{width:min(520px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:22px;box-shadow:0 18px 45px rgba(15,23,42,.28);font-family:Tahoma,Arial,sans-serif;color:#0f172a}
      .alert-settings-box h2{margin:0 0 8px;font-size:28px;text-align:center;color:#0f172a}
      .alert-settings-box p{margin:0 0 18px;text-align:center;color:#64748b;font-weight:700;line-height:1.7}
      .alert-setting-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dbe4ee;border-radius:14px;padding:13px 14px;margin:10px 0;background:#f8fafc;font-weight:900}
      .alert-setting-row small{display:block;color:#64748b;margin-top:4px;font-weight:700;line-height:1.5}
      .alert-setting-row input[type='checkbox']{width:24px;height:24px;accent-color:#0f766e}
      .alert-setting-row input[type='number']{width:92px;height:34px;text-align:center;border:1px solid #cbd5e1;border-radius:10px;font-weight:900}
      .alert-settings-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
      .alert-settings-actions button,.alert-settings-open{border:1px solid #d6dee8;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer;background:#f8fafc;color:#0f172a}
      .alert-settings-save{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
      .alert-settings-test{background:#0f766e!important;color:#fff!important;border-color:#0f766e!important}
    `;
    document.head.appendChild(style);
  }

  function makeButton(){
    if (document.getElementById('alertSettingsButton')) return;
    const buttons = Array.from(document.querySelectorAll('button'));
    const anchor = buttons.find((button) => /الإعلانات المجدولة/.test(button.textContent || '')) || buttons.find((button) => /إدارة الرسائل/.test(button.textContent || '')) || buttons.at(-1);
    const button = document.createElement('button');
    button.id = 'alertSettingsButton';
    button.type = 'button';
    button.className = 'alert-settings-open';
    button.textContent = 'تنبيهات الهاتف';
    button.addEventListener('click', openDialog);
    if (anchor && anchor.parentElement) anchor.insertAdjacentElement('afterend', button);
    else document.body.appendChild(button);
  }

  function fromTable(row){
    if (!row) return null;
    return {
      enabled: !!row.enabled,
      beforeEndEnabled: row.before_end_enabled !== false,
      beforeEndMinutes: Number(row.before_end_minutes || 5),
      endEnabled: row.end_enabled !== false,
      phoneNotificationEnabled: row.phone_notification_enabled !== false,
      screenAlertEnabled: true,
      soundEnabled: !!row.sound_enabled,
      soundUrl: row.sound_url || ''
    };
  }

  async function loadTableSettings(client){
    try {
      const result = await client
        .from('school_alert_settings')
        .select('enabled,before_end_enabled,before_end_minutes,end_enabled,phone_notification_enabled,sound_enabled,sound_url,updated_at')
        .eq('school_slug', slug())
        .maybeSingle();
      if (!result.error && result.data) return { ...DEFAULTS, ...fromTable(result.data) };
    } catch (error) {}
    return null;
  }

  async function loadLegacySettings(client){
    try {
      const result = await client.from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', slug())
        .like('message_text', PREFIX + '%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (result.data && result.data[0]) {
        return { ...DEFAULTS, ...JSON.parse(String(result.data[0].message_text).slice(PREFIX.length)) };
      }
    } catch(error) {}
    return null;
  }

  async function loadSettings(){
    const client = db();
    if (!client) return { ...DEFAULTS };
    const tableSettings = await loadTableSettings(client);
    if (tableSettings) return tableSettings;
    const legacySettings = await loadLegacySettings(client);
    return legacySettings || { ...DEFAULTS };
  }

  async function saveLegacySettings(client, settings){
    const text = PREFIX + JSON.stringify({ ...settings, savedAt: new Date().toISOString() });
    await client.from('school_messages').delete().eq('school_slug', slug()).like('message_text', PREFIX + '%');
    await client.from('school_messages').insert({ school_slug: slug(), message_text: text, is_active: false, sort_order: 9997 });
  }

  async function saveTableSettings(client, settings){
    const payload = {
      school_slug: slug(),
      enabled: !!settings.enabled,
      before_end_enabled: !!settings.beforeEndEnabled,
      before_end_minutes: Math.max(1, Math.min(30, Number(settings.beforeEndMinutes || 5))),
      end_enabled: !!settings.endEnabled,
      phone_notification_enabled: settings.phoneNotificationEnabled !== false,
      sound_enabled: !!settings.soundEnabled,
      sound_url: settings.soundUrl || null
    };

    const result = await client
      .from('school_alert_settings')
      .upsert(payload, { onConflict: 'school_slug' });

    if (result.error) throw result.error;
  }

  async function saveLog(client, settings){
    try {
      await client.from('system_logs').insert({
        actor_type: 'school_admin',
        actor_name: 'school-dashboard',
        school_slug: slug(),
        action: 'save_alert_settings_dual_write',
        entity_type: 'school_alert_settings',
        new_data: {
          enabled: !!settings.enabled,
          beforeEndMinutes: Number(settings.beforeEndMinutes || 5),
          soundEnabled: !!settings.soundEnabled
        },
        details: 'تم حفظ إعدادات التنبيهات في school_alert_settings وفي __ALERT_SETTINGS__ مؤقتًا.'
      });
    } catch (error) {}
  }

  async function saveSettings(settings){
    const client = db();
    if (!client) return;
    await saveTableSettings(client, settings);
    await saveLegacySettings(client, settings);
    await saveLog(client, settings);
  }

  function row(label, note, input){
    const div = document.createElement('label');
    div.className = 'alert-setting-row';
    const text = document.createElement('span');
    text.innerHTML = label + (note ? `<small>${note}</small>` : '');
    div.append(text, input);
    return div;
  }

  async function openDialog(){
    css();
    const settings = await loadSettings();
    const overlay = document.createElement('div');
    overlay.className = 'alert-settings-dialog';
    const box = document.createElement('div');
    box.className = 'alert-settings-box';
    box.innerHTML = '<h2>تنبيهات الهاتف</h2><p>إعدادات مختصرة للتنبيه قبل نهاية الحصة وعند نهايتها.</p>';

    const enabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.enabled });
    const beforeEndEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.beforeEndEnabled });
    const beforeEndMinutes = Object.assign(document.createElement('input'), { type:'number', min:'1', max:'30', value: Number(settings.beforeEndMinutes || 5) });
    const endEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.endEnabled });
    const soundEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.soundEnabled });

    box.append(
      row('تفعيل التنبيهات', 'تشغيل أو إيقاف جميع التنبيهات.', enabled),
      row('تنبيه قبل نهاية الحصة', 'يظهر عداد تنازلي داخل شاشة المؤقت.', beforeEndEnabled),
      row('عدد دقائق التنبيه قبل النهاية', 'من 1 إلى 30 دقيقة.', beforeEndMinutes),
      row('تنبيه عند نهاية الحصة', 'يعرض رسالة عند انتهاء الحصة.', endEnabled),
      row('الصوت', 'تشغيل صوت التنبيه عند السماح من الجهاز.', soundEnabled)
    );

    const actions = document.createElement('div');
    actions.className = 'alert-settings-actions';
    const test = document.createElement('button');
    test.className = 'alert-settings-test';
    test.textContent = 'اختبار';
    test.onclick = () => alert('اختبار تنبيه مؤقت الحصص');
    const close = document.createElement('button');
    close.textContent = 'إغلاق';
    close.onclick = () => overlay.remove();
    const save = document.createElement('button');
    save.className = 'alert-settings-save';
    save.textContent = 'حفظ';
    save.onclick = async () => {
      save.disabled = true;
      save.textContent = 'جارٍ الحفظ...';
      try {
        await saveSettings({
          enabled: enabled.checked,
          beforeEndEnabled: beforeEndEnabled.checked,
          beforeEndMinutes: Number(beforeEndMinutes.value || 5),
          endEnabled: endEnabled.checked,
          phoneNotificationEnabled: true,
          screenAlertEnabled: true,
          soundEnabled: soundEnabled.checked,
          soundUrl: ''
        });
        save.textContent = 'تم الحفظ';
        setTimeout(() => overlay.remove(), 700);
      } catch (error) {
        console.warn('تعذر حفظ إعدادات التنبيهات:', error);
        save.disabled = false;
        save.textContent = 'تعذر الحفظ - أعد المحاولة';
      }
    };
    actions.append(test, close, save);
    box.appendChild(actions);
    overlay.appendChild(box);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function start(){ css(); makeButton(); setInterval(makeButton, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
