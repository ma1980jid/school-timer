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
      const durationInput = row.querySelector('.dur input');

      const name = (periodInput && periodInput.value || '').trim();
      const start = (timeInputs[0] && timeInputs[0].value || '').trim();
      const end = (timeInputs[1] && timeInputs[1].value || '').trim();
      const duration = (durationInput && durationInput.value || '').trim();
      const type = (select && select.value || '').trim();

      return { name, start, end, duration, type };
    }).filter((item) => item.name && item.start && item.end);
  }

  function toPeriodType(row){
    const name = String(row && row.name || '');
    const type = String(row && row.type || '');
    if (name.includes('طابور')) return 'assembly';
    if (name.includes('فسحة')) return 'break';
    if (name.includes('صلاة') || name === 'الصلاة') return 'prayer';
    if (name.includes('نشاط')) return 'activity';
    if (type === 'حصة') return 'lesson';
    return 'custom';
  }

  async function saveLegacyRows(db, rows){
    const text = PREFIX + JSON.stringify({
      savedAt: new Date().toISOString(),
      rows
    });

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
  }

  async function saveTableRows(db, rows){
    const school = slug();
    await db.from('school_schedule_rows')
      .delete()
      .eq('school_slug', school)
      .eq('schedule_name', 'default');

    const tableRows = rows.map((row, index) => ({
      school_slug: school,
      schedule_name: 'default',
      period_name: row.name,
      period_type: toPeriodType(row),
      start_time: row.start,
      end_time: row.end,
      duration_minutes: row.duration ? Number(row.duration) : null,
      order_index: index + 1,
      is_active: true,
      notes: row.type || null
    }));

    if (tableRows.length) {
      await db.from('school_schedule_rows').insert(tableRows);
    }
  }

  async function saveLog(db, rows){
    try {
      await db.from('system_logs').insert({
        actor_type: 'school_admin',
        actor_name: 'school-dashboard',
        school_slug: slug(),
        action: 'save_schedule_rows_dual_write',
        entity_type: 'school_schedule_rows',
        new_data: { rows_count: rows.length },
        details: 'تم حفظ جدول الحصص في الجدول الجديد وفي الرسالة القديمة مؤقتًا.'
      });
    } catch (error) {}
  }

  async function saveRows(){
    const db = client();
    if (!db) return;
    const rows = readRows();
    if (!rows.length) return;

    try {
      await saveTableRows(db, rows);
      await saveLegacyRows(db, rows);
      await saveLog(db, rows);
    } catch (error) {
      console.warn('تعذر حفظ جدول العرض في الجدول الجديد والقديم:', error);
      try { await saveLegacyRows(db, rows); } catch (legacyError) {}
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
