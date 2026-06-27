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
      const allInputs = Array.from(row.querySelectorAll('input'));
      const select = row.querySelector('select');

      const periodInput = allInputs.find((input) => input.type !== 'time' && !input.closest('.dur'));
      const timeInputs = allInputs.filter((input) => input.type === 'time');

      const name = (periodInput && periodInput.value || '').trim();
      const start = (timeInputs[0] && timeInputs[0].value || '').trim();
      const end = (timeInputs[1] && timeInputs[1].value || '').trim();
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
      setTimeout(saveRows, 300);
      setTimeout(saveRows, 900);
      setTimeout(saveRows, 1600);
    });
  }

  function start(){
    hookSaveButton();
    setInterval(hookSaveButton, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
