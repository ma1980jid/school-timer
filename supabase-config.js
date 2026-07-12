window.SCHOOL_TIMER_SUPABASE_URL = ['https://kzhxmwejyfsuorcdvujb','supabase','co'].join('.');
window.SCHOOL_TIMER_SUPABASE_ANON_KEY = ['sb','publishable','SMJPGEWFq0B0nCyMvu9Sbg','kt7N5hd5'].join('_');
window.SCHOOL_TIMER_SLUG = new URLSearchParams(location.search).get('school') || '__neutral__';

(function installSystemAdminSupabaseFallback(){
  const isSystemAdmin = location.pathname.includes('system-admin.html');
  if (!isSystemAdmin || (window.supabase && typeof window.supabase.createClient === 'function')) return;

  function encodePath(path){
    return String(path || '').split('/').map(encodeURIComponent).join('/');
  }

  function createClient(baseUrl, anonKey){
    const root = String(baseUrl || '').replace(/\/$/, '');
    const authHeaders = { apikey: anonKey, Authorization: 'Bearer ' + anonKey };

    class QueryBuilder {
      constructor(table){
        this.table = table;
        this.method = 'GET';
        this.body = null;
        this.params = new URLSearchParams();
        this.singleMode = false;
        this.maybeSingleMode = false;
      }
      select(columns='*'){ this.method = 'GET'; this.params.set('select', columns); return this; }
      insert(payload){ this.method = 'POST'; this.body = payload; return this; }
      update(payload){ this.method = 'PATCH'; this.body = payload; return this; }
      delete(){ this.method = 'DELETE'; return this; }
      eq(column, value){ this.params.set(column, 'eq.' + String(value)); return this; }
      order(column, options={}){ this.params.set('order', column + '.' + (options.ascending === false ? 'desc' : 'asc')); return this; }
      limit(value){ this.params.set('limit', String(value)); return this; }
      single(){ this.singleMode = true; return this; }
      maybeSingle(){ this.maybeSingleMode = true; return this; }
      then(resolve, reject){ return this.execute().then(resolve, reject); }
      async execute(){
        try {
          const query = this.params.toString();
          const url = root + '/rest/v1/' + encodeURIComponent(this.table) + (query ? '?' + query : '');
          const headers = { ...authHeaders };
          const options = { method: this.method, headers };
          if (this.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
            headers.Prefer = 'return=representation';
            if (this.body !== null) options.body = JSON.stringify(this.body);
          }
          if (this.singleMode || this.maybeSingleMode) headers.Accept = 'application/vnd.pgrst.object+json';

          const response = await fetch(url, options);
          const text = await response.text();
          let data = null;
          if (text) {
            try { data = JSON.parse(text); }
            catch (error) { data = text; }
          }
          if (!response.ok) {
            const message = data && typeof data === 'object'
              ? (data.message || data.error_description || data.hint || response.statusText)
              : String(data || response.statusText);
            return { data: null, error: { message, details: data && data.details, hint: data && data.hint, code: data && data.code, status: response.status } };
          }
          if (this.maybeSingleMode && Array.isArray(data)) data = data[0] || null;
          return { data, error: null };
        } catch (error) {
          return { data: null, error: { message: error && error.message ? error.message : String(error) } };
        }
      }
    }

    return {
      from(table){ return new QueryBuilder(table); },
      storage: {
        from(bucket){
          return {
            async upload(path, file, options={}){
              try {
                const headers = { ...authHeaders, 'x-upsert': options.upsert ? 'true' : 'false' };
                headers['Content-Type'] = options.contentType || (file && file.type) || 'application/octet-stream';
                const response = await fetch(root + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encodePath(path), {
                  method: 'POST', headers, body: file
                });
                const text = await response.text();
                let data = null;
                if (text) {
                  try { data = JSON.parse(text); }
                  catch (error) { data = text; }
                }
                if (!response.ok) {
                  const message = data && typeof data === 'object' ? (data.message || data.error || response.statusText) : String(data || response.statusText);
                  return { data: null, error: { message, status: response.status } };
                }
                return { data: data || { path }, error: null };
              } catch (error) {
                return { data: null, error: { message: error && error.message ? error.message : String(error) } };
              }
            },
            getPublicUrl(path){
              return { data: { publicUrl: root + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + encodePath(path) } };
            }
          };
        }
      }
    };
  }

  window.supabase = { createClient };
  window.SCHOOL_TIMER_USING_LOCAL_SUPABASE_FALLBACK = true;
})();

function loadScript(src){
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.head.appendChild(script);
}

function loadStyle(href){
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const isDashboardPage = location.pathname.includes('dashboard-v2.html');
const isInstallPage = location.pathname.includes('install.html');

if (isDashboardPage) {
  loadScript('dashboard-messages.js?v=messages-admin-08');
  loadScript('dashboard-v2-fixes.js?v=dashboard-fixes-07');
  loadScript('dashboard-title-layout-fix.js?v=title-layout-05');
  loadScript('dashboard-links-compact-fix.js?v=links-compact-01');
  loadScript('dashboard-center-school-name.js?v=center-school-01');
  loadScript('dashboard-stable-links.js?v=stable-links-01');
  loadScript('dashboard-schedule-sync.js?v=schedule-sync-03');
  loadScript('dashboard-alert-settings.js?v=alerts-dashboard-03');
  loadScript('dashboard-single-design-lock.js?v=single-design-01');
} else if (!isInstallPage) {
  loadStyle('mobile-current-row-clean.css?v=mobile-row-01');
  loadScript('viewer-schedule-sync.js?v=schedule-sync-05');
  window.addEventListener('load', function(){
    loadScript('viewer-alerts-v2.js?v=viewer-alerts-04');
  });
}
