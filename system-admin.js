(function(){
  const $ = (id) => document.getElementById(id);
  const state = { schools: [], selected: null, client: null };

  function showStatus(message, type='ok'){
    const box = $('systemStatus');
    if (!box) return;
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { box.style.display = 'none'; }, 3500);
  }

  function ensureQrStyle(){
    if (document.getElementById('systemAdminQrStyle')) return;
    const style = document.createElement('style');
    style.id = 'systemAdminQrStyle';
    style.textContent = `
      .qr-wrap{display:grid;place-items:center;background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:10px;margin-top:6px;min-height:166px;gap:6px}
      .qr-wrap img{width:124px;height:124px;object-fit:contain;display:block}
      .qr-note{text-align:center;color:#64748b;font-size:12px;font-weight:900;margin-top:2px}
      .qr-copy{height:30px!important;min-height:30px!important;border-radius:10px!important;font-size:12px!important;padding:0 10px!important;background:#f8fafc!important;color:#0f172a!important;border:1px solid #cbd5e1!important;font-weight:900!important;cursor:pointer!important}
    `;
    document.head.appendChild(style);
  }

  function qrSrc(url){
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=' + encodeURIComponent(url || '');
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
    return String(text || '').trim().toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/\-+/g, '-').replace(/^\-+|\-+$/g, '');
  }

  function slugFromName(name){
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    if (clean.includes('الشيخ سيف')) return 'alsheikh-saif';
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
      app: `${base}install.html?school=${s}`
    };
  }

  function copyText(text, msg){
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showStatus(msg || 'تم نسخ الرابط بنجاح')).catch(() => showStatus('تعذر النسخ', 'err'));
  }

  function linksText(school){
    const links = buildLinks(school.school_slug);
    return [
      `اسم المدرسة: ${school.school_name || ''}`,
      `رابط لوحة مدير المدرسة: ${links.dashboard}`,
      `رابط شاشة الحاسوب: ${links.desktop}`,
      `رابط الهاتف والآيباد: ${links.mobile}`,
      `رابط صفحة التثبيت: ${links.app}`,
      school.admin_code ? `رمز المدير: ${school.admin_code}` : ''
    ].filter(Boolean).join('\n');
  }

  function renderLinks(school){
    ensureQrStyle();
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
      app: 'صفحة التثبيت و QR'
    }).map(([key, label]) => {
      const qr = qrSrc(links[key]);
      return `
        <div class="linkbox">
          <b>${label}</b>
          <div class="url" id="url_${key}">${links[key]}</div>
          <button class="btn light" type="button" data-copy="${key}">نسخ الرابط</button>
          <div class="qr-wrap"><img src="${qr}" alt="QR ${label}" loading="lazy"><div class="qr-note">امسح الرمز لفتح الرابط</div><button class="qr-copy" type="button" data-copy-qr="${qr}">نسخ QR</button></div>
        </div>
      `;
    }).join('');
    box.querySelectorAll('[data-copy]').forEach((button) => {
      button.onclick = () => copyText(links[button.dataset.copy], 'تم نسخ الرابط بنجاح');
    });
    box.querySelectorAll('[data-copy-qr]').forEach((button) => {
      button.onclick = () => copyText(button.getAttribute('data-copy-qr'), 'تم نسخ رابط صورة QR');
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
          ${school.governorate || ''}${school.wilayat ? ' - ' + school.wilayat : ''}
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.school-card').forEach((card) => {
      card.onclick = () => selectSchool(Number(card.dataset.id));
    });
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
      theme_style: 'omani'
    };

    const result = id
      ? await db.from('schools').update(payload).eq('id', id)
      : await db.from('schools').insert(payload);

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

  function init(){
    ensureQrStyle();
    $('refreshBtn').onclick = loadSchools;
    $('saveSchoolBtn').onclick = saveSchool;
    $('newSchoolBtn').onclick = resetForm;
    $('toggleSchoolBtn').onclick = toggleSelected;
    $('copySelectedBtn').onclick = () => state.selected ? copyText(linksText(state.selected), 'تم نسخ روابط المدرسة') : showStatus('اختر مدرسة أولًا.', 'warn');
    $('searchBox').addEventListener('input', renderSchools);
    $('schoolName').addEventListener('input', () => {
      if (!$('schoolSlug').value.trim() && !state.selected) $('schoolSlug').value = slugFromName($('schoolName').value);
    });
    $('logoUrl').addEventListener('input', () => updateLogoPreview($('logoUrl').value.trim()));
    renderLinks(null);
    loadSchools();
    setTimeout(loadSchools, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
