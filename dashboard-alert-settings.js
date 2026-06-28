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
    soundEnabled: false
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
      .alert-settings-box{width:min(560px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:22px;box-shadow:0 18px 45px rgba(15,23,42,.28);font-family:Tahoma,Arial,sans-serif;color:#0f172a}
      .alert-settings-box h2{margin:0 0 8px;font-size:28px;text-align:center;color:#0f172a}
      .alert-settings-box p{margin:0 0 18px;text-align:center;color:#64748b;font-weight:700;line-height:1.7}
      .alert-setting-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dbe4ee;border-radius:14px;padding:12px 14px;margin:10px 0;background:#f8fafc;font-weight:800}
      .alert-setting-row small{display:block;color:#64748b;margin-top:4px;font-weight:700}
      .alert-setting-row input[type='checkbox']{width:22px;height:22px;accent-color:#0f766e}
      .alert-setting-row input[type='number']{width:86px;border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;font-weight:900}
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

  async function loadSettings(){
    const client = db();
    if (!client) return { ...DEFAULTS };
    try {
      const result = await client.from('school_messages')
        .select('message_text,created_at')
        .eq('school_slug', slug())
        .eq('is_active', true)
        .like('message_text', PREFIX + '%')
        .order('created_at', { ascending: false })
        .limit(1);
      if (result.data && result.data[0]) {
        return { ...DEFAULTS, ...JSON.parse(String(result.data[0].message_text).slice(PREFIX.length)) };
      }
    } catch(error) {}
    return { ...DEFAULTS };
  }

  async function saveSettings(settings){
    const client = db();
    if (!client) return;
    const text = PREFIX + JSON.stringify({ ...settings, savedAt: new Date().toISOString() });
    await client.from('school_messages').delete().eq('school_slug', slug()).like('message_text', PREFIX + '%');
    await client.from('school_messages').insert({ school_slug: slug(), message_text: text, is_active: true, sort_order: 9997 });
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
    box.innerHTML = '<h2>تنبيهات الهاتف</h2><p>تظهر التنبيهات قبل نهاية الحصة وعند نهايتها حسب اختيار مدير المدرسة. إشعارات الهاتف تحتاج إذنًا من الجهاز.</p>';

    const enabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.enabled });
    const beforeEndEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.beforeEndEnabled });
    const beforeEndMinutes = Object.assign(document.createElement('input'), { type:'number', min:'1', max:'20', value: Number(settings.beforeEndMinutes || 5) });
    const endEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.endEnabled });
    const phoneNotificationEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.phoneNotificationEnabled });
    const screenAlertEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.screenAlertEnabled });
    const soundEnabled = Object.assign(document.createElement('input'), { type:'checkbox', checked: !!settings.soundEnabled });

    box.append(
      row('تفعيل التنبيهات', 'تشغيل أو إيقاف جميع التنبيهات.', enabled),
      row('تنبيه قبل نهاية الحصة', 'يعرض تنبيهًا قبل نهاية الحصة.', beforeEndEnabled),
      row('عدد الدقائق قبل النهاية', 'الافتراضي 5 دقائق.', beforeEndMinutes),
      row('تنبيه عند نهاية الحصة', 'يعرض تنبيهًا عند انتهاء الحصة.', endEnabled),
      row('إشعار الهاتف', 'يعمل عند السماح بالإشعارات من الجهاز.', phoneNotificationEnabled),
      row('تنبيه داخل الشاشة', 'يظهر داخل واجهة المؤقت.', screenAlertEnabled),
      row('صوت التنبيه', 'اختياري وقد يتطلب تفاعلًا مع الهاتف.', soundEnabled)
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
      await saveSettings({
        enabled: enabled.checked,
        beforeEndEnabled: beforeEndEnabled.checked,
        beforeEndMinutes: Math.max(1, Math.min(20, Number(beforeEndMinutes.value || 5))),
        endEnabled: endEnabled.checked,
        phoneNotificationEnabled: phoneNotificationEnabled.checked,
        screenAlertEnabled: screenAlertEnabled.checked,
        soundEnabled: soundEnabled.checked
      });
      save.textContent = 'تم الحفظ';
      setTimeout(() => overlay.remove(), 700);
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
