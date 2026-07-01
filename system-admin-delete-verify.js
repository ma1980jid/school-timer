(function(){
  if (window.__systemAdminDeleteVerifyLoaded) return;
  window.__systemAdminDeleteVerifyLoaded = true;

  const RELATED_TABLES = [
    'school_display_messages',
    'school_messages',
    'school_timer_settings',
    'school_schedule_rows',
    'school_alert_settings',
    'school_devices',
    'device_activations'
  ];

  function $(id){ return document.getElementById(id); }
  function selectedSlug(){ return String(($('schoolId') && $('schoolId').value) || ($('schoolSlug') && $('schoolSlug').value) || '').trim(); }
  function selectedName(){ return String(($('schoolName') && $('schoolName').value) || '').trim(); }

  function client(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__deleteVerifyClient) {
      window.__deleteVerifyClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__deleteVerifyClient;
  }

  function show(message, type){
    const box = $('systemStatus');
    if (!box) return alert(message);
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
  }

  function cleanLocal(slug){
    try {
      ['school_timer_messages_','school_timer_middle_cards_','school_timer_scheduled_','school_timer_settings_','school_timer_identity_','school_timer_admin_code_'].forEach((prefix) => {
        localStorage.removeItem(prefix + slug);
        sessionStorage.removeItem(prefix + slug);
      });
    } catch (error) {}
  }

  async function schoolExists(db, slug){
    const result = await db.from('schools').select('school_slug').eq('school_slug', slug).maybeSingle();
    if (result.error && result.error.code !== 'PGRST116') throw result.error;
    return !!result.data;
  }

  async function deleteRelatedRows(db, slug){
    for (const table of RELATED_TABLES) {
      try { await db.from(table).delete().eq('school_slug', slug); }
      catch (error) {}
    }
  }

  async function tryRpcDelete(db, slug, code){
    try {
      const result = await db.rpc('delete_school_cascade', {
        p_school_slug: slug,
        p_confirm_slug: slug,
        p_system_code: code || ''
      });
      if (result.error) return { ok:false, error: result.error };
      return { ok: !!result.data, error:null };
    } catch (error) {
      return { ok:false, error };
    }
  }

  async function tryDirectDelete(db, slug){
    await deleteRelatedRows(db, slug);
    const result = await db.from('schools').delete().eq('school_slug', slug).select('school_slug');
    if (result.error) return { ok:false, error:result.error, rows:[] };
    return { ok:Array.isArray(result.data) && result.data.length > 0, error:null, rows:result.data || [] };
  }

  async function verifiedDelete(){
    const slug = selectedSlug();
    const name = selectedName() || slug;
    if (!slug) return show('اختر مدرسة أولًا من القائمة.', 'warn');

    if (!confirm('سيتم حذف المدرسة وبياناتها المرتبطة:\n\n' + name + '\n' + slug + '\n\nهل تريد المتابعة؟')) return;
    const typed = prompt('للتأكيد اكتب الرابط المختصر للمدرسة كما هو:\n' + slug);
    if (String(typed || '').trim() !== slug) return show('تم إلغاء الحذف؛ لم يتم إدخال الرابط المختصر بشكل صحيح.', 'warn');

    const db = client();
    if (!db) return show('لم يتم تحميل اتصال Supabase بعد.', 'err');

    const button = $('deleteSchoolBtn');
    if (button) { button.disabled = true; button.textContent = 'جارٍ الحذف...'; }

    try {
      const code = prompt('أدخل رمز مدير النظام لتنفيذ الحذف النهائي:') || '';
      await tryRpcDelete(db, slug, code.trim());
      let exists = await schoolExists(db, slug);

      if (exists) {
        await tryDirectDelete(db, slug);
        exists = await schoolExists(db, slug);
      }

      if (exists) {
        show('لم يتم حذف المدرسة فعليًا من قاعدة البيانات. السبب غالبًا أن صلاحيات Supabase/RLS لا تسمح بالحذف. شغّل كود SQL الخاص بدالة delete_school_cascade ثم جرّب مرة أخرى.', 'err');
        return;
      }

      cleanLocal(slug);
      show('تم حذف المدرسة فعليًا من قاعدة البيانات: ' + name, 'ok');
      if ($('newSchoolBtn')) $('newSchoolBtn').click();
      if ($('refreshBtn')) setTimeout(() => $('refreshBtn').click(), 350);
    } catch (error) {
      console.warn('Delete verify error:', error);
      show('تعذر التحقق من الحذف: ' + (error && error.message ? error.message : 'خطأ غير معروف'), 'err');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'حذف المدرسة'; }
    }
  }

  function attach(){
    const button = $('deleteSchoolBtn');
    if (!button || button.dataset.verifiedDelete === '1') return;
    button.dataset.verifiedDelete = '1';
    button.onclick = verifiedDelete;
  }

  function start(){
    attach();
    setInterval(attach, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
