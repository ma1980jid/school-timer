(function(){
  if (window.__viewerDbScheduleLoaderLoaded) return;
  window.__viewerDbScheduleLoaderLoaded = true;

  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_db_schedule_rows_' + schoolSlug;
  const CACHE_TTL = 10 * 60 * 1000;
  const REFRESH_INTERVAL = 5 * 60 * 1000;
  let client = null;
  let dbRows = null;
  let originalGetRows = null;

  function timeToHHMM(value){
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
    if (!match) return '';

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] === undefined ? 0 : Number(match[3]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return '';

    return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  }

  function normalizeSupabaseRows(rows){
    if (!Array.isArray(rows) || !rows.length) return null;

    const normalized = rows.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;

      const name = String(row.period_name || '').trim();
      const start = timeToHHMM(row.start_time);
      const end = timeToHHMM(row.end_time);
      if (!name || !start || !end) return null;

      return [name, start, end];
    });

    return normalized.every(Boolean) ? normalized : null;
  }

  function isValidNormalizedRows(rows){
    return Array.isArray(rows)
      && rows.length > 0
      && rows.every((row) => Array.isArray(row)
        && row.length >= 3
        && !!String(row[0] || '').trim()
        && /^\d{2}:\d{2}$/.test(String(row[1] || ''))
        && /^\d{2}:\d{2}$/.test(String(row[2] || '')));
  }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !Array.isArray(cached.rows)) return null;
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return null;
      return normalizeSupabaseRows(cached.rows);
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
      if (isValidNormalizedRows(dbRows)) return dbRows;
      return originalGetRows ? originalGetRows() : [];
    };

    return true;
  }

  function refreshView(){
    try { if (typeof lastTableSignature !== 'undefined') lastTableSignature = ''; } catch (error) {}
    try { if (typeof tick === 'function') tick(); } catch (error) {}
  }

  function applyNormalizedRows(rows){
    if (!isValidNormalizedRows(rows)) return false;
    if (typeof getRowsForActiveSchedule !== 'function') return false;

    dbRows = rows.map((row) => [row[0], row[1], row[2]]);
    if (!installOverride()) {
      dbRows = null;
      return false;
    }

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

      if (result.error) return false;
      const normalized = normalizeSupabaseRows(result.data);
      if (!normalized) return false;

      writeCache(result.data);
      return applyNormalizedRows(normalized);
    } catch (error) {
      return false;
    }
  }

  function start(){
    const cached = readCache();
    if (cached) applyNormalizedRows(cached);

    loadFromDatabase();
    setInterval(loadFromDatabase, REFRESH_INTERVAL);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
