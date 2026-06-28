(function(){
  if (window.__systemAutoThemeAdminLoaded) return;
  window.__systemAutoThemeAdminLoaded = true;

  const AUTO_PREFIX = '__AUTO_THEME__:';
  const THEMES = ['omani','white','green','gold'];
  const THEME_LABELS = { omani:'العماني الرسمي', white:'الأبيض الفاخر', green:'الأخضر الهادئ', gold:'الذهبي' };
  const $ = (id) => document.getElementById(id);
  let client = null;
  let schools = [];

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function showStatus(message, type){
    const box = $('systemStatus');
    if (!box) return alert(message);
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { box.style.display = 'none'; }, 3500);
  }

  function todayKey(){
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Muscat', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function ensurePanel(){
    if ($('autoThemePanel')) return;
    const linksBox = $('linksBox');
    const parent = linksBox && linksBox.parentElement;
    if (!parent) return;

    const panel = document.createElement('div');
    panel.id = 'autoThemePanel';
    panel.className = 'linkbox';
    panel.innerHTML = `
      <b>التغيير التلقائي للتصاميم</b>
      <div class="notice warn">يغيّر تصميم العرض تلقائيًا كل 20 يومًا دون تعديل التصميم الأصلي المحفوظ للمدرسة. تصميم المناسبة العام يبقى له الأولوية.</div>
      <label>تفعيل التغيير التلقائي</label>
      <select id="autoThemeEnabled"><option value="false">غير مفعّل</option><option value="true">مفعّل</option></select>
      <div class="row2">
        <div><label>تاريخ بداية الدورة</label><input id="autoThemeStart" type="date"></div>
        <div><label>مدة كل تصميم باليوم</label><input id="autoThemeDays" type="number" min="1" max="90" value="20"></div>
      </div>
      <label>تسلسل التصاميم</label>
      <div class="meta">العماني الرسمي ← الأبيض الفاخر ← الأخضر الهادئ ← الذهبي</div>
      <div class="actions"><button class="btn navy" type="button" id="saveAutoThemeBtn">حفظ وتطبيق على كل المدارس</button><button class="btn red" type="button" id="clearAutoThemeBtn">إيقاف التغيير التلقائي</button></div>
      <div id="autoThemeState" class="meta">غير مفعّل.</div>
    `;
    parent.appendChild(panel);
    $('saveAutoThemeBtn').onclick = saveAutoTheme;
    $('clearAutoThemeBtn').onclick = clearAutoTheme;
    $('autoThemeStart').value = todayKey();
  }

  function currentAutoTheme(config){
    if (!config || !config.enabled) return null;
    const start = new Date(String(config.startDate || todayKey()) + 'T00:00:00+04:00').getTime();
    const now = new Date(todayKey() + 'T00:00:00+04:00').getTime();
    const days = Math.max(0, Math.floor((now - start) / 86400000));
    const interval = Math.max(1, Number(config.intervalDays || 20));
    const sequence = Array.isArray(config.sequence) && config.sequence.length ? config.sequence : THEMES;
    const index = Math.floor(days / interval) % sequence.length;
    const nextIndex = (index + 1) % sequence.length;
    const nextIn = interval - (days % interval);
    return { theme:sequence[index], nextTheme:sequence[nextIndex], nextIn };
  }

  function fillForm(config){
    const item = config || {};
    if ($('autoThemeEnabled')) $('autoThemeEnabled').value = item.enabled ? 'true' : 'false';
    if ($('autoThemeStart')) $('autoThemeStart').value = item.startDate || todayKey();
    if ($('autoThemeDays')) $('autoThemeDays').value = item.intervalDays || 20;
    const current = currentAutoTheme(item);
    if ($('autoThemeState')) {
      $('autoThemeState').textContent = item.enabled && current
        ? `مفعّل — التصميم الحالي: ${THEME_LABELS[current.theme] || current.theme} — التالي بعد ${current.nextIn} يوم: ${THEME_LABELS[current.nextTheme] || current.nextTheme}`
        : 'غير مفعّل.';
    }
  }

  function readForm(){
    return {
      enabled: $('autoThemeEnabled').value === 'true',
      startDate: $('autoThemeStart').value || todayKey(),
      intervalDays: Math.max(1, Number($('autoThemeDays').value || 20)),
      sequence: THEMES,
      savedAt: new Date().toISOString()
    };
  }

  async function loadSchools(){
    const db = getClient();
    if (!db) return [];
    const { data, error } = await db.from('schools').select('school_slug,school_name').order('id', { ascending:true });
    if (error) return [];
    schools = (data || []).filter((school) => school.school_slug);
    return schools;
  }

  async function loadAutoTheme(){
    ensurePanel();
    const db = getClient();
    if (!db) return;
    try {
      await loadSchools();
      const { data, error } = await db.from('school_messages')
        .select('message_text,created_at')
        .like('message_text', AUTO_PREFIX + '%')
        .order('created_at', { ascending:false })
        .limit(1);
      if (error || !data || !data[0]) return fillForm(null);
      const config = JSON.parse(String(data[0].message_text).slice(AUTO_PREFIX.length));
      fillForm(config);
    } catch (error) {
      fillForm(null);
    }
  }

  async function saveAutoTheme(){
    const db = getClient();
    if (!db) return showStatus('لم يتم تحميل اتصال قاعدة البيانات.', 'err');
    const config = readForm();
    if (!config.enabled) return clearAutoTheme();
    await loadSchools();
    if (!schools.length) return showStatus('لا توجد مدارس لتطبيق التغيير التلقائي عليها.', 'warn');
    try {
      await db.from('school_messages').delete().like('message_text', AUTO_PREFIX + '%');
      const text = AUTO_PREFIX + JSON.stringify(config);
      const rows = schools.map((school) => ({ school_slug:school.school_slug, message_text:text, is_active:true, sort_order:9995 }));
      const { error } = await db.from('school_messages').insert(rows);
      if (error) throw error;
      fillForm(config);
      showStatus('تم تفعيل التغيير التلقائي للتصاميم كل ' + config.intervalDays + ' يومًا.');
    } catch (error) {
      console.error(error);
      showStatus('تعذر حفظ إعداد التغيير التلقائي.', 'err');
    }
  }

  async function clearAutoTheme(){
    const db = getClient();
    if (!db) return showStatus('لم يتم تحميل اتصال قاعدة البيانات.', 'err');
    try {
      const { error } = await db.from('school_messages').delete().like('message_text', AUTO_PREFIX + '%');
      if (error) throw error;
      fillForm(null);
      showStatus('تم إيقاف التغيير التلقائي للتصاميم.');
    } catch (error) {
      console.error(error);
      showStatus('تعذر إيقاف التغيير التلقائي.', 'err');
    }
  }

  function start(){
    const timer = setInterval(() => {
      ensurePanel();
      if ($('autoThemePanel')) {
        clearInterval(timer);
        loadAutoTheme();
      }
    }, 500);
    setTimeout(() => clearInterval(timer), 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
