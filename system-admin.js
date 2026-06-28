(function(){
  const $ = (id) => document.getElementById(id);
  const EVENT_PREFIX = '__GLOBAL_EVENT_THEME__:';
  const state = { schools: [], selected: null, client: null, eventTheme: null };

  function showStatus(message, type='ok'){
    const box = $('systemStatus');
    if (!box) return;
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { box.style.display = 'none'; }, 3500);
  }

  function getClient(){
    if (state.client) return state.client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) {
      showStatus('لم يتم تحميل اتصال Supabase بعد. أعد المحاولة بعد لحظات.', 'warn');
      return null;
    }
    state.client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return state.client;
  }

  function cleanSlug(text){
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^\-+|\-+$/g, '');
  }

  function slugFromName(name){
    const map = {
      'مدرسة الشيخ سيف بن حمد الأغبري': 'alsheikh-saif',
      'مدرسة الأحبة': 'alahba'
    };
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    if (map[clean]) return map[clean];
    return 'school-' + Date.now().toString(36);
  }

  function appBase(){
    const path = location.pathname.replace(/[^/]*$/, '');
    return location.origin + path;
  }

  function buildLinks(slug){
    const base = appBase();
    const s = encodeURIComponent(slug || '');
    return {
      dashboard: `${base}dashboard-v2.html?school=${s}`,
      desktop: `${base}index.html?school=${s}&view=desktop`,
      mobile: `${base}index.html?school=${s}&view=mobile`,
      app: `${base}index.html?school=${s}&view=mobile&app=1`
    };
  }

  function copyText(text){
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showStatus('تم نسخ الرابط بنجاح')).catch(() => showStatus('تعذر النسخ', 'err'));
  }

  function linksText(school){
    const links = buildLinks(school.school_slug);
    return [
      `اسم المدرسة: ${school.school_name || ''}`,
      `رابط لوحة مدير المدرسة: ${links.dashboard}`,
      `رابط شاشة الحاسوب: ${links.desktop}`,
      `رابط الهاتف والآيباد: ${links.mobile}`,
      `رابط الإضافة كتطبيق: ${links.app}`,
      school.admin_code ? `رمز المدير: ${school.admin_code}` : ''
    ].filter(Boolean).join('\n');
  }

  function renderLinks(school){
    const box = $('linksBox');
    if (!box) return;
    if (!school) {
      box.innerHTML = '<div class="notice warn">اختر مدرسة من القائمة لعرض الروابط.</div>';
      return;
    }
    const links = buildLinks(school.school_slug);
    box.innerHTML = Object.entries({
      dashboard: 'لوحة مدير المدرسة',
      desktop: 'شاشة الحاسوب',
      mobile: 'الهاتف والآيباد',
      app: 'الإضافة كتطبيق'
    }).map(([key, label]) => `
      <div class="linkbox">
        <b>${label}</b>
        <div class="url" id="url_${key}">${links[key]}</div>
        <button class="btn light" type="button" data-copy="${key}">نسخ الرابط</button>
      </div>
    `).join('');
    box.querySelectorAll('[data-copy]').forEach((button) => {
      button.onclick = () => copyText(links[button.dataset.copy]);
    });
  }

  function renderSchools(){
    const list = $('schoolsList');
    const search = String($('searchBox') && $('searchBox').value || '').trim().toLowerCase();
    if (!list) return;
    const filtered = state.schools.filter((school) => {
      const hay = `${school.school_name || ''} ${school.school_slug || ''} ${school.governorate || ''} ${school.wilayat || ''}`.toLowerCase();
      return !search || hay.includes(search);
    });
    $('schoolsCount').textContent = `${state.schools.length} مدرسة`;
    if (!filtered.length) {
      list.innerHTML = '<div class="notice warn">لا توجد مدارس مطابقة.</div>';
      return;
    }
    list.innerHTML = filtered.map((school) => `
      <div class="school-card ${state.selected && state.selected.id === school.id ? 'active' : ''}" data-id="${school.id}">
        <div class="school-title">
          <span>${school.school_name || 'مدرسة بدون اسم'}</span>
          <span class="status ${school.is_active ? 'on' : 'off'}">${school.is_active ? 'مفعلة' : 'موقوفة'}</span>
        </div>
        <div class="meta">
          الرابط: ${school.school_slug || '--'}<br>
          ${school.governorate || ''}${school.wilayat ? ' - ' + school.wilayat : ''}<br>
          التصميم: ${themeLabel(school.theme_style)}
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.school-card').forEach((card) => {
      card.onclick = () => selectSchool(Number(card.dataset.id));
    });
  }

  function themeLabel(value){
    return ({ omani:'العماني الرسمي', white:'الأبيض الفاخر', green:'الأخضر الهادئ', gold:'الذهبي' })[value] || 'العماني الرسمي';
  }

  async function loadSchools(){
    const db = getClient();
    if (!db) return;
    const { data, error } = await db.from('schools').select('*').order('id', { ascending:true });
    if (error) return showStatus('تعذر تحميل المدارس. تحقق من صلاحيات قاعدة البيانات.', 'err');
    state.schools = data || [];
    renderSchools();
    if (state.selected) {
      const fresh = state.schools.find((school) => school.id === state.selected.id);
      if (fresh) selectSchool(fresh.id);
    }
  }

  function selectSchool(id){
    const school = state.schools.find((item) => item.id === id);
    if (!school) return;
    state.selected = school;
    $('schoolId').value = school.id || '';
    $('schoolName').value = school.school_name || '';
    $('schoolSlug').value = school.school_slug || '';
    $('governorate').value = school.governorate || '';
    $('wilayat').value = school.wilayat || '';
    $('adminCode').value = school.admin_code || '';
    $('isActive').value = school.is_active ? 'true' : 'false';
    $('themeStyle').value = school.theme_style || 'omani';
    $('logoUrl').value = school.logo_url || '';
    updateLogoPreview(school.logo_url || '');
    $('toggleSchoolBtn').style.display = 'block';
    $('toggleSchoolBtn').textContent = school.is_active ? 'إيقاف المدرسة' : 'تفعيل المدرسة';
    renderLinks(school);
    renderSchools();
  }

  function resetForm(){
    state.selected = null;
    ['schoolId','schoolName','schoolSlug','governorate','wilayat','adminCode','logoUrl'].forEach((id) => { const el=$(id); if (el) el.value=''; });
    $('isActive').value = 'true';
    $('themeStyle').value = 'omani';
    $('logoFile').value = '';
    $('toggleSchoolBtn').style.display = 'none';
    updateLogoPreview('');
    renderLinks(null);
    renderSchools();
  }

  function updateLogoPreview(url){
    const img = $('logoPreview');
    if (!img) return;
    if (url) { img.src = url; img.style.display = 'block'; }
    else { img.removeAttribute('src'); img.style.display = 'none'; }
  }

  async function uploadLogoIfNeeded(slug){
    const file = $('logoFile').files && $('logoFile').files[0];
    if (!file) return $('logoUrl').value.trim();
    const db = getClient();
    if (!db) return $('logoUrl').value.trim();
    const safeName = `${slug || 'school'}-${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._\-]/g, '-');
    const path = `logos/${safeName}`;
    const { error } = await db.storage.from('school-logos').upload(path, file, { upsert:true });
    if (error) {
      showStatus('تعذر رفع الشعار. سيتم حفظ رابط الشعار إن وجد.', 'warn');
      return $('logoUrl').value.trim();
    }
    const { data } = db.storage.from('school-logos').getPublicUrl(path);
    return data && data.publicUrl || $('logoUrl').value.trim();
  }

  async function saveSchool(){
    const db = getClient();
    if (!db) return;
    const id = $('schoolId').value.trim();
    const name = $('schoolName').value.trim();
    const slug = cleanSlug($('schoolSlug').value.trim() || slugFromName(name));
    if (!name || !slug) return showStatus('أدخل اسم المدرسة والرابط المختصر.', 'err');
    $('schoolSlug').value = slug;
    const logo = await uploadLogoIfNeeded(slug);
    const payload = {
      school_name: name,
      school_slug: slug,
      governorate: $('governorate').value.trim(),
      wilayat: $('wilayat').value.trim(),
      admin_code: $('adminCode').value.trim(),
      logo_url: logo || null,
      app_icon_url: logo || null,
      is_active: $('isActive').value === 'true',
      primary_color: '#0f766e',
      secondary_color: '#b7791f',
      background_color: '#f8f2e8',
      theme_style: $('themeStyle').value || 'omani'
    };

    let result;
    if (id) {
      result = await db.from('schools').update(payload).eq('id', id);
    } else {
      result = await db.from('schools').insert(payload);
    }
    if (result.error) {
      console.error(result.error);
      return showStatus('تعذر حفظ المدرسة. قد يكون الرابط المختصر مكررًا أو تحتاج صلاحيات قاعدة البيانات.', 'err');
    }
    showStatus(id ? 'تم تحديث بيانات المدرسة.' : 'تمت إضافة المدرسة بنجاح.');
    await loadSchools();
    const saved = state.schools.find((school) => school.school_slug === slug);
    if (saved) selectSchool(saved.id);
  }

  async function toggleSelected(){
    if (!state.selected) return;
    const db = getClient();
    if (!db) return;
    const next = !state.selected.is_active;
    const { error } = await db.from('schools').update({ is_active: next }).eq('id', state.selected.id);
    if (error) return showStatus('تعذر تغيير حالة المدرسة.', 'err');
    showStatus(next ? 'تم تفعيل المدرسة.' : 'تم إيقاف المدرسة.');
    await loadSchools();
  }

  function ensureEventPanel(){
    if ($('eventThemePanel')) return;
    const linksBox = $('linksBox');
    if (!linksBox || !linksBox.parentElement) return;
    const panel = document.createElement('div');
    panel.id = 'eventThemePanel';
    panel.className = 'linkbox';
    panel.innerHTML = `
      <b>تصميم مناسبة عام</b>
      <div class="notice warn">يطبق مؤقتًا على كل المدارس خلال الفترة المحددة، ثم يعود كل مؤقت لتصميم مدرسته الأصلي.</div>
      <label>تفعيل التصميم المؤقت</label>
      <select id="eventEnabled"><option value="false">غير مفعّل</option><option value="true">مفعّل</option></select>
      <label>اسم المناسبة</label>
      <input id="eventTitle" placeholder="مثال: اليوم الوطني / يوم المعلم / رمضان">
      <div class="row2">
        <div><label>من تاريخ</label><input id="eventStart" type="date"></div>
        <div><label>إلى تاريخ</label><input id="eventEnd" type="date"></div>
      </div>
      <label>التصميم المستخدم</label>
      <select id="eventTheme"><option value="omani">العماني الرسمي</option><option value="white">الأبيض الفاخر</option><option value="green">الأخضر الهادئ</option><option value="gold">الذهبي</option></select>
      <div class="actions"><button class="btn navy" type="button" id="saveEventThemeBtn">تطبيق على كل المدارس</button><button class="btn red" type="button" id="clearEventThemeBtn">إيقاف التصميم العام</button></div>
      <div id="eventThemeState" class="meta">لا يوجد تصميم مناسبة نشط.</div>
    `;
    linksBox.parentElement.appendChild(panel);
    $('saveEventThemeBtn').onclick = saveGlobalEventTheme;
    $('clearEventThemeBtn').onclick = clearGlobalEventTheme;
  }

  function fillEventForm(config){
    const item = config || {};
    if ($('eventEnabled')) $('eventEnabled').value = item.enabled ? 'true' : 'false';
    if ($('eventTitle')) $('eventTitle').value = item.title || '';
    if ($('eventStart')) $('eventStart').value = item.startDate || '';
    if ($('eventEnd')) $('eventEnd').value = item.endDate || '';
    if ($('eventTheme')) $('eventTheme').value = item.theme || 'gold';
    if ($('eventThemeState')) {
      $('eventThemeState').textContent = item.enabled ? `نشط: ${item.title || 'مناسبة'} من ${item.startDate || '--'} إلى ${item.endDate || '--'} — ${themeLabel(item.theme)}` : 'لا يوجد تصميم مناسبة نشط.';
    }
  }

  async function loadGlobalEventTheme(){
    ensureEventPanel();
    const db = getClient();
    if (!db) return;
    try {
      const { data, error } = await db.from('school_messages')
        .select('message_text,created_at')
        .like('message_text', EVENT_PREFIX + '%')
        .order('created_at', { ascending:false })
        .limit(1);
      if (error || !data || !data[0]) {
        state.eventTheme = null;
        fillEventForm(null);
        return;
      }
      state.eventTheme = JSON.parse(String(data[0].message_text).slice(EVENT_PREFIX.length));
      fillEventForm(state.eventTheme);
    } catch (error) {
      fillEventForm(null);
    }
  }

  function readEventForm(){
    return {
      enabled: $('eventEnabled').value === 'true',
      title: $('eventTitle').value.trim(),
      startDate: $('eventStart').value,
      endDate: $('eventEnd').value || $('eventStart').value,
      theme: $('eventTheme').value || 'gold',
      savedAt: new Date().toISOString()
    };
  }

  async function saveGlobalEventTheme(){
    const db = getClient();
    if (!db) return;
    const config = readEventForm();
    if (!config.enabled) return clearGlobalEventTheme();
    if (!config.title || !config.startDate) return showStatus('أدخل اسم المناسبة وتاريخ البداية.', 'err');
    const schools = state.schools.filter((school) => school.school_slug);
    if (!schools.length) return showStatus('لا توجد مدارس لتطبيق التصميم عليها.', 'warn');
    try {
      await db.from('school_messages').delete().like('message_text', EVENT_PREFIX + '%');
      const text = EVENT_PREFIX + JSON.stringify(config);
      const rows = schools.map((school) => ({ school_slug: school.school_slug, message_text:text, is_active:true, sort_order:9996 }));
      const { error } = await db.from('school_messages').insert(rows);
      if (error) throw error;
      state.eventTheme = config;
      fillEventForm(config);
      showStatus('تم تطبيق تصميم المناسبة على كل المدارس.');
    } catch (error) {
      console.error(error);
      showStatus('تعذر تطبيق تصميم المناسبة. تحقق من صلاحيات school_messages.', 'err');
    }
  }

  async function clearGlobalEventTheme(){
    const db = getClient();
    if (!db) return;
    try {
      const { error } = await db.from('school_messages').delete().like('message_text', EVENT_PREFIX + '%');
      if (error) throw error;
      state.eventTheme = null;
      fillEventForm(null);
      showStatus('تم إيقاف التصميم العام المؤقت.');
    } catch (error) {
      console.error(error);
      showStatus('تعذر إيقاف التصميم العام.', 'err');
    }
  }

  function init(){
    $('refreshBtn').onclick = loadSchools;
    $('saveSchoolBtn').onclick = saveSchool;
    $('newSchoolBtn').onclick = resetForm;
    $('toggleSchoolBtn').onclick = toggleSelected;
    $('copySelectedBtn').onclick = () => state.selected ? copyText(linksText(state.selected)) : showStatus('اختر مدرسة أولًا.', 'warn');
    $('searchBox').addEventListener('input', renderSchools);
    $('schoolName').addEventListener('input', () => {
      if (!$('schoolSlug').value.trim() && !state.selected) $('schoolSlug').value = slugFromName($('schoolName').value);
    });
    $('logoUrl').addEventListener('input', () => updateLogoPreview($('logoUrl').value.trim()));
    renderLinks(null);
    ensureEventPanel();
    loadSchools().then(loadGlobalEventTheme);
    setTimeout(loadSchools, 1000);
    setTimeout(loadGlobalEventTheme, 1400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
