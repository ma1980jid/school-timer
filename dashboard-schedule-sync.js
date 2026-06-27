(function(){
  if (window.__dashboardScheduleSyncLoaded) return;
  window.__dashboardScheduleSyncLoaded = true;

  const PREFIX = '__SCHEDULE_ROWS__:';

  function slug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function client(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__scheduleSyncClient) {
      window.__scheduleSyncClient = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    }
    return window.__scheduleSyncClient;
  }

  function readRows(){
    return Array.from(document.querySelectorAll('#periodRows .r')).map((row) => {
      const inputs = Array.from(row.querySelectorAll('input'));
      const times = inputs.filter((input) => input.type === 'time' || /^\d{2}:\d{2}$/.test(input.value || ''));
      const textInputs = inputs.filter((input) => input.type !== 'time');
      const select = row.querySelector('select');
      const name = (textInputs[0] && textInputs[0].value || '').trim();
      const start = (times[0] && times[0].value || '').trim();
      const end = (times[1] && times[1].value || '').trim();
      const type = (select && select.value || '').trim();
      return { name, start, end, type };
    }).filter((item) => item.name && item.start && item.end);
  }

  async function saveRows(){
    const db = client();
    if (!db) return;
    const rows = readRows();
    if (!rows.length) return;

    const text = PREFIX + JSON.stringify({
      savedAt: new Date().toISOString(),
      rows
    });

    try {
      await db.from('school_messages')
        .delete()
        .eq('school_slug', slug())
        .like('message_text', PREFIX + '%');

      await db.from('school_messages').insert({
        school_slug: slug(),
        message_text: text,
        is_active: true,
        sort_order: 9998
      });
    } catch (error) {
      console.warn('تعذر حفظ جدول العرض كما هو:', error);
    }
  }

  function hookSaveButton(){
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveButton = buttons.find((button) => /حفظ الإعدادات/.test(button.textContent || ''));
    if (!saveButton || saveButton.dataset.scheduleSync === '1') return;
    saveButton.dataset.scheduleSync = '1';
    saveButton.addEventListener('click', function(){
      setTimeout(saveRows, 500);
      setTimeout(saveRows, 1200);
    });
  }

  function start(){
    hookSaveButton();
    setInterval(hookSaveButton, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
