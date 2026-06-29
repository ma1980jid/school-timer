(function(){
  if (window.__viewerDbScheduleLoaderLoaded) return;
  window.__viewerDbScheduleLoaderLoaded = true;

  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_db_schedule_rows_' + schoolSlug;
  let client = null;
  let dbRows = null;
  let originalGetRows = null;

  function timeToHHMM(value){
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return String(match[1]).padStart(2, '0') + ':' + match[2];
  }

  function normalizeRows(rows){
    return (Array.isArray(rows) ? rows : [])
      .map((row) => [
        String(row.period_name || row.name || '').trim(),
        timeToHHMM(row.start_time || row.start),
        timeToHHMM(row.end_time || row.end)
      ])
      .filter((row) => row[0] && row[1] && row[2]);
  }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !Array.isArray(cached.rows)) return null;
      if (Date.now() - Number(cached.savedAt || 0) > 10 * 60 * 1000) return null;
      const rows = normalizeRows(cached.rows);
      return rows.length ? rows : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(rows){
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), rows }));
    } catch (error) {}
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  function installOverride(){
    if (typeof getRowsForActiveSchedule !== 'function') return false;
    if (!originalGetRows) originalGetRows = getRowsForActiveSchedule;

    getRowsForActiveSchedule = function(){
      if (Array.isArray(dbRows) && dbRows.length) return dbRows;
      return originalGetRows ? originalGetRows() : [];
    };

    return true;
  }

  function refreshView(){
    try { if (typeof lastTableSignature !== 'undefined') lastTableSignature = ''; } catch (error) {}
    try { if (typeof tick === 'function') tick(); } catch (error) {}
  }

  function applyRows(rows){
    const normalized = normalizeRows(rows);
    if (!normalized.length) return false;
    dbRows = normalized;
    installOverride();
    refreshView();
    return true;
  }

  async function loadFromDatabase(){
    const db = getClient();
    if (!db) return false;

    try {
      const result = await db
        .from('school_schedule_rows')
        .select('period_name,start_time,end_time,order_index')
        .eq('school_slug', schoolSlug)
        .eq('schedule_name', 'default')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (result.error || !Array.isArray(result.data) || !result.data.length) return false;
      const rows = normalizeRows(result.data);
      if (!rows.length) return false;
      writeCache(result.data);
      return applyRows(rows);
    } catch (error) {
      return false;
    }
  }

  function start(){
    installOverride();
    const cached = readCache();
    if (cached) applyRows(cached);

    let attempts = 0;
    const timer = setInterval(async function(){
      attempts += 1;
      const ok = await loadFromDatabase();
      if (ok || attempts >= 20) clearInterval(timer);
    }, 500);

    setInterval(loadFromDatabase, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
