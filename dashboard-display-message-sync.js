(function(){
  if (window.__dashboardDisplayMessageSyncLoaded) return;
  window.__dashboardDisplayMessageSyncLoaded = true;

  const SYSTEM_MARKERS = [
    '__CARD_',
    '__SCHEDULED__:',
    '__SCHEDULE_ROWS__:',
    '__ALERT_SETTINGS__:',
    '__GLOBAL_EVENT_THEME__:',
    '__AUTO_THEME__:'
  ];

  function schoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function isSystemMessage(message){
    const text = String(message || '').trim();
    return SYSTEM_MARKERS.some((marker) => text.startsWith(marker) || text.includes(marker));
  }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.__dashboardDisplayMessageSyncClient) {
      window.__dashboardDisplayMessageSyncClient = window.supabase.createClient(
        window.SCHOOL_TIMER_SUPABASE_URL,
        window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      );
    }
    return window.__dashboardDisplayMessageSyncClient;
  }

  async function readLegacyMessages(db, slug){
    const { data, error } = await db
      .from('school_messages')
      .select('message_text,sort_order,is_active,created_at')
      .eq('school_slug', slug)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !Array.isArray(data)) return [];

    return data
      .map((row) => ({
        message_text: String(row.message_text || '').trim(),
        sort_order: Number(row.sort_order || 100),
        created_at: row.created_at || new Date().toISOString()
      }))
      .filter((row) => row.message_text && !isSystemMessage(row.message_text));
  }

  function uniqueRows(rows){
    const seen = new Set();
    const out = [];
    rows.forEach((row) => {
      const key = row.message_text;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(row);
    });
    return out;
  }

  async function syncDisplayMessages(){
    const db = getClient();
    if (!db) return;
    const slug = schoolSlug();
    const rows = uniqueRows(await readLegacyMessages(db, slug));
    if (!rows.length) return;

    try {
      await db
        .from('school_display_messages')
        .delete()
        .eq('school_slug', slug)
        .eq('message_type', 'ticker')
        .eq('target_area', 'ticker');

      const displayRows = rows.map((row, index) => ({
        school_slug: slug,
        message_text: row.message_text,
        message_type: 'ticker',
        target_area: 'ticker',
        sort_order: index + 1,
        is_active: true,
        created_at: row.created_at
      }));

      const { error } = await db
        .from('school_display_messages')
        .insert(displayRows);

      if (error) {
        console.warn('تعذر مزامنة رسائل العرض الجديدة:', error.message || error);
        return;
      }

      try {
        localStorage.setItem('school_timer_messages_' + slug, JSON.stringify({
          savedAt: Date.now(),
          messages: displayRows.map((row) => row.message_text)
        }));
      } catch (cacheError) {}

      try {
        await db.from('system_logs').insert({
          actor_type: 'school_admin',
          actor_name: 'dashboard-display-message-sync',
          school_slug: slug,
          action: 'sync_legacy_messages_to_display_messages',
          entity_type: 'school_display_messages',
          new_data: { messages_count: displayRows.length },
          details: 'تمت مزامنة الرسائل العادية من school_messages إلى school_display_messages بعد الحفظ.'
        });
      } catch (logError) {}
    } catch (error) {
      console.warn('خطأ في مزامنة رسائل العرض الجديدة:', error);
    }
  }

  function hookSaveButtons(){
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons
      .filter((button) => /حفظ الرسائل|حفظ الإعدادات/.test(button.textContent || ''))
      .forEach((button) => {
        if (button.dataset.displayMessageSync === '1') return;
        button.dataset.displayMessageSync = '1';
        button.addEventListener('click', function(){
          setTimeout(syncDisplayMessages, 900);
          setTimeout(syncDisplayMessages, 1800);
          setTimeout(syncDisplayMessages, 3200);
        });
      });
  }

  function start(){
    hookSaveButtons();
    setInterval(hookSaveButtons, 1500);
  }

  window.syncDisplayMessagesNow = syncDisplayMessages;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
