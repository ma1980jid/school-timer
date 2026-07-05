(function(){
  if (window.__systemInstallLinkFixLoaded) return;
  window.__systemInstallLinkFixLoaded = true;

  function toInstallUrl(oldUrl){
    try {
      const url = new URL(oldUrl, location.href);
      const school = url.searchParams.get('school') || 'alsheikh-saif';
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'install.html?school=' + encodeURIComponent(school);
    } catch (error) {
      return '';
    }
  }

  function copy(text){
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function patchInstallLink(){
    const appUrl = document.getElementById('url_app');
    if (!appUrl) return;
    const current = appUrl.textContent || '';
    if (!current.includes('app=1') && !current.includes('index.html')) return;
    const next = toInstallUrl(current);
    if (!next) return;
    appUrl.textContent = next;
    const btn = document.querySelector('[data-copy="app"]');
    if (btn) btn.onclick = function(){ copy(next); };
  }

  function shareUrl(slug){
    const base = String(window.SCHOOL_TIMER_SUPABASE_URL || 'https://kzhxmwejyfsuorcdvujb.supabase.co').replace(/\/$/, '');
    return base + '/functions/v1/school-share?school=' + encodeURIComponent(slug || '');
  }

  function patchShareLink(){
    const slug = selectedSlug();
    const box = document.getElementById('linksBox');
    if (!slug || !box || !box.querySelector('.linkbox')) return;
    const url = shareUrl(slug);
    let item = document.getElementById('schoolShareLinkBox');
    if (!item) {
      item = document.createElement('div');
      item.id = 'schoolShareLinkBox';
      item.className = 'linkbox';
      item.innerHTML = '<b>رابط المشاركة في واتساب</b><div class="url" id="url_share"></div><button class="btn light" type="button" id="copyShareLinkBtn">نسخ رابط المشاركة</button>';
      box.appendChild(item);
    }
    const urlBox = document.getElementById('url_share');
    const button = document.getElementById('copyShareLinkBtn');
    if (urlBox) urlBox.textContent = url;
    if (button) button.onclick = function(){ copy(url); status('تم نسخ رابط المشاركة', 'ok'); };
  }

  function status(message, type){
    const box = document.getElementById('systemStatus');
    if (!box) return alert(message);
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
  }

  function selectedSlug(){
    return String((document.getElementById('schoolId') && document.getElementById('schoolId').value) || (document.getElementById('schoolSlug') && document.getElementById('schoolSlug').value) || '').trim();
  }

  function selectedName(){
    return String((document.getElementById('schoolName') && document.getElementById('schoolName').value) || '').trim();
  }

  function db(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__systemDeleteVerifyClient) {
      window.__systemDeleteVerifyClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__systemDeleteVerifyClient;
  }

  async function schoolExists(client, slug){
    const result = await client.from('schools').select('school_slug').eq('school_slug', slug).maybeSingle();
    if (result.error && result.error.code !== 'PGRST116') throw result.error;
    return !!result.data;
  }

  function cleanLocal(slug){
    try {
      ['school_timer_messages_','school_timer_middle_cards_','school_timer_scheduled_','school_timer_settings_','school_timer_identity_','school_timer_admin_code_'].forEach((prefix) => {
        localStorage.removeItem(prefix + slug);
        sessionStorage.removeItem(prefix + slug);
      });
    } catch (error) {}
  }

  async function callDeleteRpc(client, slug, code){
    try {
      const result = await client.rpc('delete_school_cascade', {
        p_school_slug: slug,
        p_confirm_slug: slug,
        p_system_code: code.trim()
      });
      return result || { error: null, data: null };
    } catch (error) {
      return { error: error, data: null };
    }
  }

  async function verifiedDelete(){
    const slug = selectedSlug();
    const name = selectedName() || slug;
    if (!slug) return status('اختر مدرسة أولًا من القائمة.', 'warn');
    if (!confirm('سيتم حذف المدرسة وبياناتها المرتبطة:\n\n' + name + '\n' + slug + '\n\nهل تريد المتابعة؟')) return;
    const typed = prompt('للتأكيد اكتب الرابط المختصر للمدرسة كما هو:\n' + slug);
    if (String(typed || '').trim() !== slug) return status('تم إلغاء الحذف؛ لم يتم إدخال الرابط المختصر بشكل صحيح.', 'warn');

    const client = db();
    if (!client) return status('لم يتم تحميل اتصال Supabase بعد.', 'err');
    const button = document.getElementById('deleteSchoolBtn');
    if (button) { button.disabled = true; button.textContent = 'جارٍ الحذف...'; }

    try {
      const code = prompt('أدخل رمز مدير النظام لتنفيذ الحذف النهائي:') || '';
      const rpcResult = await callDeleteRpc(client, slug, code);
      if (rpcResult.error) console.warn('تعذر تنفيذ دالة الحذف:', rpcResult.error);

      let exists = await schoolExists(client, slug);
      if (exists) {
        await client.from('schools').delete().eq('school_slug', slug).select('school_slug');
        exists = await schoolExists(client, slug);
      }
      if (exists) {
        status('لم يتم حذف المدرسة فعليًا من قاعدة البيانات. شغّل ملف SQL: database/delete_school_cascade.sql من Supabase ثم جرّب مرة أخرى، وتأكد من إدخال رمز الحذف الصحيح.', 'err');
        return;
      }
      cleanLocal(slug);
      status('تم حذف المدرسة فعليًا من قاعدة البيانات: ' + name, 'ok');
      const reset = document.getElementById('newSchoolBtn');
      const refresh = document.getElementById('refreshBtn');
      if (reset) reset.click();
      if (refresh) setTimeout(() => refresh.click(), 350);
    } catch (error) {
      status('تعذر التحقق من الحذف: ' + (error && error.message ? error.message : 'خطأ غير معروف'), 'err');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'حذف المدرسة'; }
    }
  }

  function patchDelete(){
    const button = document.getElementById('deleteSchoolBtn');
    if (!button) return;
    button.onclick = verifiedDelete;
    button.dataset.verifiedDelete = '1';
  }

  function patchAll(){
    patchInstallLink();
    patchShareLink();
    patchDelete();
  }

  function start(){
    patchAll();
    setTimeout(patchAll, 1200);
    setTimeout(patchAll, 3000);
    setInterval(function(){ patchShareLink(); patchDelete(); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
