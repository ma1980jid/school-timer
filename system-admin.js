(function(){
  const $ = (id) => document.getElementById(id);
  const state = { schools: [], selected: null, client: null };
  const RELATED_TABLES = ['school_display_messages','school_messages','school_timer_settings','school_schedule_rows','school_alert_settings','school_devices','device_activations'];

  function schoolKey(school){ return String((school && school.school_slug) || ''); }
  function errorText(error){ return error ? [error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ') : ''; }

  function showStatus(message, type='ok', sticky=false){
    const box = $('systemStatus');
    if (!box) return alert(message);
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
    clearTimeout(showStatus.timer);
    if (!sticky) showStatus.timer = setTimeout(() => { box.style.display = 'none'; }, 4500);
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
      #deleteSchoolBtn{margin-top:8px!important;width:100%!important}
    `;
    document.head.appendChild(style);
  }

  function qrSrc(url){ return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=' + encodeURIComponent(url || ''); }

  function getClient(){
    if (state.client) return state.client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) {
      showStatus('لم يتم تحميل اتصال Supabase بعد. أعد المحاولة بعد لحظات.', 'warn');
      return null;
    }
    state.client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return state.client;
  }

  function cleanSlug(text){ return String(text || '').trim().toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/\-+/g, '-').replace(/^\-+|\-+$/g, ''); }
  function slugFromName(name){
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    if (clean.includes('الشيخ سيف')) return 'alsheikh-saif';
    return 'school-' + Date.now().toString(36);
  }
  function appBase(){ return location.origin + location.pathname.replace(/[^/]*$/, ''); }
  function buildLinks(slug){
    const base = appBase();
    const s = encodeURIComponent(slug || '');
    return {
      dashboard: `${base}dashboard-v2.html?school=${s}`,
      desktop: `${base}index.html?school=${s}&view=desktop&v=no-default-logo-01`,
      mobile: `${base}index.html?school=${s}&view=mobile&v=no-default-logo-01`,
      app: `${base}install.html?school=${s}`
    };
  }

  function copyText(text, msg){
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showStatus(msg || 'تم نسخ الرابط بنجاح')).catch(() => showStatus('تعذر النسخ', 'err'));
  }

  async function copyQrImage(qrUrl){
    try{
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard-image-not-supported');
      const response = await fetch(qrUrl, { mode:'cors', cache:'no-store' });
      if (!response.ok) throw new Error('qr-fetch-failed');
      let blob = await response.blob();
      if (blob.type !== 'image/png') blob = new Blob([blob], { type:'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showStatus('تم نسخ صورة QR');
    }catch(error){
      showStatus('تعذر نسخ صورة QR من هذا المتصفح. افتح QR واضغط بزر الفأرة الأيمن أو اضغط مطولًا لنسخ الصورة.', 'warn');
    }
  }

  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function logoFileToCompactDataUrl(file){
    const raw = await fileToDataUrl(file);
    if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) return raw;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const max = 512;
          const scale = Math.min(1, max / Math.max(img.width || max, img.height || max));
          const w = Math.max(1, Math.round((img.width || max) * scale));
          const h = Math.max(1, Math.round((img.height || max) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) { resolve(raw); }
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    });
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
    box.innerHTML = Object.entries({ dashboard:'لوحة مدير المدرسة', desktop:'شاشة الحاسوب', mobile:'الهاتف والآيباد', app:'صفحة التثبيت و QR' }).map(([key,label]) => {
      const qr = qrSrc(links[key]);
      return `<div class="linkbox"><b>${label}</b><div class="url" id="url_${key}">${links[key]}</div><button class="btn light" type="button" data-copy="${key}">نسخ الرابط</button><div class="qr-wrap"><img src="${qr}" alt="QR ${label}" loading="lazy"><div class="qr-note">امسح الرمز لفتح الرابط</div><button class="qr-copy" type="button" data-copy-qr-image="${qr}">نسخ صورة QR</button></div></div>`;
    }).join('');
    box.querySelectorAll('[data-copy]').forEach((button) => { button.onclick = () => copyText(links[button.dataset.copy], 'تم نسخ الرابط بنجاح'); });
    box.querySelectorAll('[data-copy-qr-image]').forEach((button) => { button.onclick = () => copyQrImage(button.getAttribute('data-copy-qr-image')); });
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
    list.innerHTML = filtered.map((school) => {
      const key = schoolKey(school);
      return `<div class="school-card ${state.selected && schoolKey(state.selected) === key ? 'active' : ''}" data-slug="${key}"><div class="school-title"><span>${school.school_name || 'مدرسة بدون اسم'}</span><span class="status ${school.is_active ? 'on' : 'off'}">${school.is_active ? 'مفعلة' : 'موقوفة'}</span></div><div class="meta">الرابط: ${school.school_slug || '--'}<br>${school.governorate || ''}${school.wilayat ? ' - ' + school.wilayat : ''}</div></div>`;
    }).join('');
    list.querySelectorAll('.school-card').forEach((card) => { card.onclick = () => selectSchool(card.dataset.slug); });
  }

  async function loadSchools(){
    const db = getClient();
    if (!db) return;
    const { data, error } = await db.from('schools').select('*').order('school_slug', { ascending:true });
    if (error) return showStatus('تعذر تحميل المدارس: ' + errorText(error), 'err', true);
    state.schools = data || [];
    renderSchools();
    if (state.selected) {
      const fresh = state.schools.find((school) => schoolKey(school) === schoolKey(state.selected));
      if (fresh) selectSchool(schoolKey(fresh));
    }
  }

  function selectSchool(slug){
    const school = state.schools.find((item) => schoolKey(item) === String(slug));
    if (!school) return;
    state.selected = school;
    $('schoolId').value = school.school_slug || '';
    $('schoolName').value = school.school_name || '';
    $('schoolSlug').value = school.school_slug || '';
    $('governorate').value = school.governorate || '';
    $('wilayat').value = school.wilayat || '';
    $('adminCode').value = school.admin_code || '';
    $('isActive').value = school.is_active ? 'true' : 'false';
    $('logoUrl').value = school.logo_url || school.app_icon_url || '';
    updateLogoPreview(school.logo_url || school.app_icon_url || '');
    $('toggleSchoolBtn').style.display = 'block';
    $('toggleSchoolBtn').textContent = school.is_active ? 'إيقاف المدرسة' : 'تفعيل المدرسة';
    const del = $('deleteSchoolBtn');
    if (del) del.style.display = 'block';
    renderLinks(school);
    renderSchools();
  }

  function resetForm(){
    state.selected = null;
    ['schoolId','schoolName','schoolSlug','governorate','wilayat','adminCode','logoUrl'].forEach((id) => { const el=$(id); if (el) el.value=''; });
    $('isActive').value = 'true';
    $('logoFile').value = '';
    $('toggleSchoolBtn').style.display = 'none';
    const del = $('deleteSchoolBtn');
    if (del) del.style.display = 'none';
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
    const safeName = `${slug || 'school'}-${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._\-]/g, '-');
    const path = `logos/${safeName}`;

    if (db && db.storage) {
      try {
        const { error } = await db.storage.from('school-logos').upload(path, file, { upsert:true });
        if (!error) {
          const { data } = db.storage.from('school-logos').getPublicUrl(path);
          if (data && data.publicUrl) return data.publicUrl;
        }
        if (error) showStatus('لم يتم الرفع إلى Storage، سيتم حفظ الشعار داخل بيانات المدرسة. السبب: ' + errorText(error), 'warn', true);
      } catch (error) {
        showStatus('لم يتم الرفع إلى Storage، سيتم حفظ الشعار داخل بيانات المدرسة.', 'warn', true);
      }
    }

    try {
      const dataUrl = await logoFileToCompactDataUrl(file);
      if (dataUrl) {
        showStatus('تم تجهيز الشعار للحفظ داخل بيانات المدرسة. اضغط حفظ المدرسة لإكمال العملية.', 'warn', false);
        return dataUrl;
      }
    } catch (error) {}

    return $('logoUrl').value.trim();
  }

  async function saveSchool(){
    const db = getClient();
    if (!db) return;
    const originalSlug = $('schoolId').value.trim();
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
    const exists = originalSlug && state.schools.some((school) => schoolKey(school) === originalSlug);
    const result = exists ? await db.from('schools').update(payload).eq('school_slug', originalSlug) : await db.from('schools').insert(payload);
    if (result.error) {
      console.error(result.error);
      return showStatus('تعذر حفظ المدرسة: ' + errorText(result.error), 'err', true);
    }
    showStatus(exists ? 'تم تحديث بيانات المدرسة.' : 'تمت إضافة المدرسة بنجاح.');
    await loadSchools();
    const saved = state.schools.find((school) => school.school_slug === slug);
    if (saved) selectSchool(schoolKey(saved));
  }

  async function toggleSelected(){
    if (!state.selected) return;
    const db = getClient();
    if (!db) return;
    const next = !state.selected.is_active;
    const { error } = await db.from('schools').update({ is_active: next }).eq('school_slug', schoolKey(state.selected));
    if (error) return showStatus('تعذر تغيير حالة المدرسة: ' + errorText(error), 'err', true);
    showStatus(next ? 'تم تفعيل المدرسة.' : 'تم إيقاف المدرسة.');
    await loadSchools();
  }

  function cleanLocalSchoolCaches(slug){
    try {
      ['school_timer_messages_','school_timer_middle_cards_','school_timer_scheduled_','school_timer_settings_','school_timer_identity_','school_timer_admin_code_'].forEach((prefix) => {
        localStorage.removeItem(prefix + slug);
        sessionStorage.removeItem(prefix + slug);
      });
    } catch (error) {}
  }

  async function deleteRelatedRows(db, slug){
    for (const table of RELATED_TABLES) {
      try { await db.from(table).delete().eq('school_slug', slug); }
      catch (error) {}
    }
  }

  async function deleteSelectedSchool(){
    if (!state.selected) return showStatus('اختر مدرسة أولًا.', 'warn');
    const slug = schoolKey(state.selected);
    const name = state.selected.school_name || slug;
    const ok = confirm('سيتم حذف المدرسة وبياناتها المرتبطة:\n\n' + name + '\n' + slug + '\n\nهل تريد المتابعة؟');
    if (!ok) return;
    const typed = prompt('للتأكيد اكتب الرابط المختصر للمدرسة كما هو:\n' + slug);
    if (String(typed || '').trim() !== slug) return showStatus('تم إلغاء الحذف؛ لم يتم إدخال الرابط المختصر بشكل صحيح.', 'warn');

    const db = getClient();
    if (!db) return;
    const button = $('deleteSchoolBtn');
    if (button) { button.disabled = true; button.textContent = 'جارٍ الحذف...'; }

    try {
      await deleteRelatedRows(db, slug);
      const { error } = await db.from('schools').delete().eq('school_slug', slug);
      if (error) throw error;
      cleanLocalSchoolCaches(slug);
      showStatus('تم حذف المدرسة بنجاح: ' + name, 'ok', true);
      resetForm();
      await loadSchools();
    } catch (error) {
      console.warn('تعذر حذف المدرسة:', error);
      showStatus('تعذر حذف المدرسة: ' + errorText(error), 'err', true);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'حذف المدرسة'; }
    }
  }

  function ensureDeleteButton(){
    if ($('deleteSchoolBtn')) return;
    const toggle = $('toggleSchoolBtn');
    if (!toggle || !toggle.parentElement) return;
    const button = document.createElement('button');
    button.id = 'deleteSchoolBtn';
    button.type = 'button';
    button.className = 'btn red';
    button.style.display = 'none';
    button.textContent = 'حذف المدرسة';
    button.onclick = deleteSelectedSchool;
    toggle.insertAdjacentElement('afterend', button);
  }

  function init(){
    ensureQrStyle();
    ensureDeleteButton();
    $('refreshBtn').onclick = loadSchools;
    $('saveSchoolBtn').onclick = saveSchool;
    $('newSchoolBtn').onclick = resetForm;
    $('toggleSchoolBtn').onclick = toggleSelected;
    $('copySelectedBtn').onclick = () => state.selected ? copyText(linksText(state.selected), 'تم نسخ روابط المدرسة') : showStatus('اختر مدرسة أولًا.', 'warn');
    $('searchBox').addEventListener('input', renderSchools);
    $('schoolName').addEventListener('input', () => { if (!$('schoolSlug').value.trim() && !state.selected) $('schoolSlug').value = slugFromName($('schoolName').value); });
    $('logoUrl').addEventListener('input', () => updateLogoPreview($('logoUrl').value.trim()));
    $('logoFile').addEventListener('change', async () => {
      const file = $('logoFile').files && $('logoFile').files[0];
      if (!file) return;
      try { updateLogoPreview(await logoFileToCompactDataUrl(file)); }
      catch (error) {}
    });
    renderLinks(null);
    loadSchools();
    setTimeout(loadSchools, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
