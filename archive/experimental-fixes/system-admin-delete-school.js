// ARCHIVED FILE
// Original path: system-admin-delete-school.js
// Archived during cleanup-production-1.0 phase 1.
// Reason: temporary delete-school implementation; replaced by verified delete flow through system-install-link-fix.js and Supabase RPC.

(function(){
  if (window.__systemAdminDeleteSchoolLoaded) return;
  window.__systemAdminDeleteSchoolLoaded = true;

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
  function currentSlug(){ return String(($('schoolId') && $('schoolId').value) || ($('schoolSlug') && $('schoolSlug').value) || '').trim(); }
  function currentName(){ return String(($('schoolName') && $('schoolName').value) || '').trim(); }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__systemDeleteClient) {
      window.__systemDeleteClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__systemDeleteClient;
  }

  function status(message, type){
    const box = $('systemStatus');
    if (!box) return alert(message);
    box.style.display = 'block';
    box.className = type === 'err' ? 'notice err' : type === 'warn' ? 'notice warn' : 'notice';
    box.textContent = message;
  }

  function cleanLocal(slug){
    try {
      [
        'school_timer_messages_',
        'school_timer_middle_cards_',
        'school_timer_scheduled_',
        'school_timer_settings_',
        'school_timer_identity_',
        'school_timer_admin_code_'
      ].forEach((prefix) => {
        localStorage.removeItem(prefix + slug);
        sessionStorage.removeItem(prefix + slug);
      });
    } catch (error) {}
  }

  async function deleteFromRelatedTables(db, slug){
    for (const table of RELATED_TABLES) {
      try {
        await db.from(table).delete().eq('school_slug', slug);
      } catch (error) {}
    }
  }

  async function deleteSchool(){
    const slug = currentSlug();
    const name = currentName();
    if (!slug) return status('اختر مدرسة أولًا من القائمة ثم اضغط حذف المدرسة.', 'warn');

    const first = confirm('سيتم حذف المدرسة المحددة وبياناتها المرتبطة من النظام.\n\nالمدرسة: ' + (name || slug) + '\nالرابط: ' + slug + '\n\nهل تريد المتابعة؟');
    if (!first) return;

    const typed = prompt('للتأكيد اكتب الرابط المختصر للمدرسة كما هو:\n' + slug);
    if (String(typed || '').trim() !== slug) return status('تم إلغاء الحذف؛ لم يتم إدخال الرابط المختصر بشكل صحيح.', 'warn');

    const db = getClient();
    if (!db) return status('لم يتم تحميل اتصال Supabase بعد.', 'err');

    const button = $('deleteSchoolBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'جارٍ الحذف...';
    }

    try {
      await deleteFromRelatedTables(db, slug);
      const result = await db.from('schools').delete().eq('school_slug', slug);
      if (result.error) throw result.error;

      cleanLocal(slug);
      status('تم حذف المدرسة بنجاح: ' + (name || slug), 'ok');

      if ($('newSchoolBtn')) $('newSchoolBtn').click();
      if ($('refreshBtn')) setTimeout(() => $('refreshBtn').click(), 350);
    } catch (error) {
      console.warn('تعذر حذف المدرسة:', error);
      status('تعذر حذف المدرسة. تأكد من صلاحيات الحذف أو وجود بيانات مرتبطة تمنع الحذف.', 'err');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'حذف المدرسة';
      }
    }
  }

  function addButton(){
    if ($('deleteSchoolBtn')) return;
    const toggle = $('toggleSchoolBtn');
    const host = toggle && toggle.parentElement;
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'deleteSchoolBtn';
    button.type = 'button';
    button.className = 'btn red';
    button.style.display = 'none';
    button.textContent = 'حذف المدرسة';
    button.onclick = deleteSchool;
    toggle.insertAdjacentElement('afterend', button);
  }

  function syncVisibility(){
    addButton();
    const button = $('deleteSchoolBtn');
    if (!button) return;
    button.style.display = currentSlug() ? 'block' : 'none';
  }

  function start(){
    syncVisibility();
    setInterval(syncVisibility, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
