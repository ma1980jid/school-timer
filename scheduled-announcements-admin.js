(function(){
  if (window.__schoolTimerScheduledAnnouncementsLoaded) return;
  window.__schoolTimerScheduledAnnouncementsLoaded = true;

  const PREFIX = '__SCHEDULED__:';
  let isSaving = false;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.schoolTimerScheduledClient) {
      window.schoolTimerScheduledClient = window.supabase.createClient(
        window.SCHOOL_TIMER_SUPABASE_URL,
        window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      );
    }
    return window.schoolTimerScheduledClient;
  }

  function toastMsg(text){
    const toast = document.getElementById('toast');
    if (!toast) return alert(text);
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function requireAdminCode(){
    const schoolSlug = getSchoolSlug();
    let code = sessionStorage.getItem('school_timer_admin_code_' + schoolSlug) || '';
    if (code) return code;
    code = prompt('أدخل رمز الإدارة الخاص بالمدرسة');
    return code ? code.trim() : '';
  }

  function todayKey(){
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function addDays(dateText, days){
    const date = new Date(dateText + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function encode(item){
    return PREFIX + JSON.stringify(item);
  }

  function decode(text){
    const value = String(text || '');
    if (!value.startsWith(PREFIX)) return null;
    try {
      return JSON.parse(value.slice(PREFIX.length));
    } catch (error) {
      return null;
    }
  }

  function clean(text){
    return String(text || '').trim();
  }

  function escapeHtml(value){
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function legacyToSlotTexts(item){
    if (item.tickerText || item.rightText || item.leftText) {
      return {
        tickerText: item.tickerText || '',
        rightText: item.rightText || '',
        leftText: item.leftText || ''
      };
    }

    const title = clean(item.title);
    const text = clean(item.text);
    const legacyText = title && text ? `${title}: ${text}` : (text || title);
    const target = clean(item.target) || 'ticker';

    return {
      tickerText: target === 'ticker' || target === 'all' ? legacyText : '',
      rightText: target === 'right' || target === 'all' ? legacyText : '',
      leftText: target === 'left' || target === 'all' ? legacyText : ''
    };
  }

  function ensureStyles(){
    if (document.getElementById('scheduledAnnouncementsStyles')) return;
    const style = document.createElement('style');
    style.id = 'scheduledAnnouncementsStyles';
    style.textContent = `
      #scheduledAnnouncementsDialog{overflow:hidden!important;padding:10px!important}
      #scheduledAnnouncementsDialog>div{max-height:calc(100dvh - 28px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable;padding-bottom:8px!important}
      .scheduled-list{display:grid;gap:12px;margin:12px 0;max-height:none;overflow:visible;padding-left:4px}
      .scheduled-row{border:1px solid #d7dee8;border-radius:18px;padding:12px;background:#f8fafc;display:grid;gap:10px}
      .scheduled-row-head{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .scheduled-row-title{font-weight:900;color:#0f172a}
      .scheduled-row-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .scheduled-row label{display:block;font-size:13px;color:#64748b;font-weight:900;margin-bottom:4px;text-align:right}
      .scheduled-row input,.scheduled-row textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;background:white;color:#0f172a;font-family:Tahoma,Arial,"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif;font-size:14px;font-weight:900;padding:8px;outline:none}
      .scheduled-row textarea{min-height:58px;resize:vertical;line-height:1.55}
      .scheduled-row input:focus,.scheduled-row textarea:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.12)}
      .scheduled-note{margin:0;color:#64748b;font-weight:900;line-height:1.8}
      .scheduled-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;position:sticky;bottom:0;z-index:5;background:linear-gradient(180deg,rgba(255,255,255,.72),#fff 42%);padding-top:12px;padding-bottom:4px}
      .scheduled-chip{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 10px;background:#ecfeff;color:#0f766e;font-size:12px;font-weight:900}
      .scheduled-slot{border:1px dashed #cbd5e1;border-radius:14px;padding:8px;background:white}
      .scheduled-slot label{color:#0f766e}
      @media(max-width:640px){#scheduledAnnouncementsDialog{align-items:flex-start!important;padding:6px!important}#scheduledAnnouncementsDialog>div{width:min(96vw,560px)!important;max-height:calc(100dvh - 12px)!important;border-radius:18px!important}.scheduled-row-grid{grid-template-columns:1fr}.scheduled-actions{grid-template-columns:1fr}.scheduled-row{padding:10px}.scheduled-row textarea{min-height:52px}}
    `;
    document.head.appendChild(style);
  }

  function createRow(item = {}){
    const row = document.createElement('div');
    row.className = 'scheduled-row';

    const start = item.start || todayKey();
    const end = item.end || item.start || addDays(start, 0);
    const id = item.id || String(Date.now()) + Math.random().toString(16).slice(2);
    const slots = legacyToSlotTexts(item);

    row.dataset.id = id;
    row.innerHTML = `
      <div class="scheduled-row-head">
        <span class="scheduled-row-title">مناسبة مجدولة</span>
        <button class="mini del" type="button">حذف</button>
      </div>
      <div class="scheduled-row-grid">
        <div>
          <label>عنوان المناسبة</label>
          <input class="scheduledTitle" value="${escapeHtml(item.title || '')}" placeholder="مثال: اليوم الوطني">
        </div>
        <div>
          <label>تاريخ البداية</label>
          <input class="scheduledStart" type="date" value="${escapeHtml(start)}">
        </div>
        <div>
          <label>تاريخ النهاية</label>
          <input class="scheduledEnd" type="date" value="${escapeHtml(end)}">
        </div>
        <div class="scheduled-row-grid">
          <label class="scheduled-chip"><input class="scheduledAnnual" type="checkbox" style="width:auto;margin-inline-end:6px"> يتكرر سنويًا</label>
          <label class="scheduled-chip"><input class="scheduledActive" type="checkbox" style="width:auto;margin-inline-end:6px" checked> مفعل</label>
        </div>
      </div>
      <div class="scheduled-slot">
        <label>عبارة شريط الرسائل</label>
        <textarea class="scheduledTickerText" placeholder="تظهر في الشريط السفلي المتحرك">${escapeHtml(slots.tickerText)}</textarea>
      </div>
      <div class="scheduled-row-grid">
        <div class="scheduled-slot">
          <label>عبارة الصندوق الأيمن</label>
          <textarea class="scheduledRightText" placeholder="تظهر في الصندوق الأيمن">${escapeHtml(slots.rightText)}</textarea>
        </div>
        <div class="scheduled-slot">
          <label>عبارة الصندوق الأيسر</label>
          <textarea class="scheduledLeftText" placeholder="تظهر ثابتة في الصندوق الأيسر">${escapeHtml(slots.leftText)}</textarea>
        </div>
      </div>
    `;

    row.querySelector('.scheduledAnnual').checked = !!item.annual;
    row.querySelector('.scheduledActive').checked = item.active !== false;
    row.querySelector('.mini.del').onclick = () => row.remove();

    return row;
  }

  function ensureDialog(){
    ensureStyles();
    if (document.getElementById('scheduledAnnouncementsDialog')) return;

    const dialog = document.createElement('div');
    dialog.id = 'scheduledAnnouncementsDialog';
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <div>
        <h3>الإعلانات المجدولة</h3>
        <p class="scheduled-note">اربط الإعلان بتاريخ محدد، ويمكنك كتابة عبارة مختلفة للشريط وللصندوقين في المناسبة نفسها.</p>
        <div id="scheduledAnnouncementsList" class="scheduled-list"></div>
        <div class="scheduled-actions">
          <button class="btn light" type="button" id="addScheduledAnnouncementBtn">إضافة مناسبة</button>
          <button class="btn navy" type="button" id="saveScheduledAnnouncementsBtn">حفظ</button>
          <button class="btn" type="button" id="closeScheduledAnnouncementsBtn">إغلاق</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document.getElementById('addScheduledAnnouncementBtn').onclick = () => addRow();
    document.getElementById('saveScheduledAnnouncementsBtn').onclick = saveAnnouncements;
    document.getElementById('closeScheduledAnnouncementsBtn').onclick = closeDialog;
  }

  function addRow(item){
    const list = document.getElementById('scheduledAnnouncementsList');
    if (!list) return;
    list.appendChild(createRow(item));
  }

  function collectRows(){
    return [...document.querySelectorAll('.scheduled-row')].map((row) => {
      const start = clean(row.querySelector('.scheduledStart')?.value);
      const end = clean(row.querySelector('.scheduledEnd')?.value) || start;
      return {
        id: row.dataset.id || String(Date.now()),
        title: clean(row.querySelector('.scheduledTitle')?.value),
        tickerText: clean(row.querySelector('.scheduledTickerText')?.value),
        rightText: clean(row.querySelector('.scheduledRightText')?.value),
        leftText: clean(row.querySelector('.scheduledLeftText')?.value),
        start,
        end,
        annual: !!row.querySelector('.scheduledAnnual')?.checked,
        active: !!row.querySelector('.scheduledActive')?.checked
      };
    }).filter((item) => (item.title || item.tickerText || item.rightText || item.leftText) && item.start && item.end);
  }

  async function loadAnnouncements(){
    const list = document.getElementById('scheduledAnnouncementsList');
    if (!list) return;
    list.replaceChildren();

    const example = {
      title: 'اليوم الوطني',
      tickerText: 'كل عام وعماننا بخير',
      rightText: 'اليوم الوطني المجيد',
      leftText: 'دامت عمان عزًا وفخرًا',
      start: todayKey(),
      end: todayKey(),
      annual: true
    };

    const client = getClient();
    if (!client) {
      addRow(example);
      return;
    }

    try {
      const { data, error } = await client
        .from('school_messages')
        .select('message_text,sort_order')
        .eq('school_slug', getSchoolSlug())
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) return;
      const items = (data || []).map((row) => decode(row.message_text)).filter(Boolean);
      if (!items.length) {
        addRow(example);
        return;
      }
      items.forEach((item) => addRow(item));
    } catch (error) {}
  }

  async function openDialog(){
    ensureDialog();
    const dialog = document.getElementById('scheduledAnnouncementsDialog');
    if (dialog) dialog.classList.add('show');
    await loadAnnouncements();
  }

  function closeDialog(){
    const dialog = document.getElementById('scheduledAnnouncementsDialog');
    if (dialog) dialog.classList.remove('show');
  }

  async function saveAnnouncements(){
    if (isSaving) return;

    const client = getClient();
    if (!client) return toastMsg('لم يتم ضبط اتصال Supabase');

    const code = requireAdminCode();
    if (!code) return toastMsg('لم يتم إدخال رمز الإدارة');

    const items = collectRows();
    if (!items.length) return toastMsg('أضف إعلانًا واحدًا على الأقل');

    const saveBtn = document.getElementById('saveScheduledAnnouncementsBtn');
    isSaving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'جارٍ الحفظ...';
    }

    try {
      const schoolSlug = getSchoolSlug();
      const { data: ok, error: authError } = await client
        .from('schools')
        .select('school_slug')
        .eq('school_slug', schoolSlug)
        .eq('admin_code', code)
        .maybeSingle();

      if (authError || !ok) {
        sessionStorage.removeItem('school_timer_admin_code_' + schoolSlug);
        return toastMsg('رمز الإدارة غير صحيح');
      }

      const { error: delError } = await client
        .from('school_messages')
        .delete()
        .eq('school_slug', schoolSlug)
        .like('message_text', PREFIX + '%');

      if (delError) return toastMsg('تعذر تحديث الإعلانات المجدولة');

      const rows = items.map((item, index) => ({
        school_slug: schoolSlug,
        message_text: encode(item),
        is_active: true,
        sort_order: 8000 + index
      }));

      const { error: insError } = await client.from('school_messages').insert(rows);
      if (insError) return toastMsg('تعذر حفظ الإعلانات المجدولة');

      sessionStorage.setItem('school_timer_admin_code_' + schoolSlug, code);
      localStorage.setItem('school_timer_scheduled_' + schoolSlug, JSON.stringify({ savedAt: Date.now(), items }));
      toastMsg('تم حفظ الإعلانات المجدولة بنجاح');
    } finally {
      isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ';
      }
    }
  }

  function hideAddPeriodButton(){
    [...document.querySelectorAll('button')].forEach((button) => {
      if (button.textContent.trim().includes('إضافة فترة جديدة')) {
        button.style.display = 'none';
        button.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function addButton(){
    if (document.getElementById('scheduledAnnouncementsBtn')) return;
    const actions = document.querySelector('.actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.id = 'scheduledAnnouncementsBtn';
    btn.className = 'btn light';
    btn.type = 'button';
    btn.textContent = 'الإعلانات المجدولة';
    btn.onclick = openDialog;

    const announcementsBtn = document.getElementById('middleCardsAdminBtn');
    actions.insertBefore(btn, announcementsBtn ? announcementsBtn.nextSibling : null);
  }

  function start(){
    addButton();
    hideAddPeriodButton();
    setTimeout(addButton, 1000);
    setTimeout(hideAddPeriodButton, 500);
    setTimeout(hideAddPeriodButton, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
