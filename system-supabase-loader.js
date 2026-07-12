(function(){
  'use strict';

  function hasSupabase(){
    return !!(window.supabase && typeof window.supabase.createClient === 'function');
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('تعذر تحميل: ' + src));
      document.body.appendChild(script);
    });
  }

  function encodePath(path){
    return String(path || '').split('/').map(encodeURIComponent).join('/');
  }

  function installRestFallback(){
    if (hasSupabase()) return true;

    const baseUrl = String(window.SCHOOL_TIMER_SUPABASE_URL || '').replace(/\/$/, '');
    const anonKey = String(window.SCHOOL_TIMER_SUPABASE_ANON_KEY || '');
    if (!baseUrl || !anonKey) return false;

    const authHeaders = { apikey: anonKey, Authorization: 'Bearer ' + anonKey };

    class QueryBuilder {
      constructor(table){
        this.table = table;
        this.method = 'GET';
        this.body = null;
        this.params = new URLSearchParams();
      }
      select(columns='*'){ this.method = 'GET'; this.params.set('select', columns); return this; }
      insert(payload){ this.method = 'POST'; this.body = payload; return this; }
      update(payload){ this.method = 'PATCH'; this.body = payload; return this; }
      delete(){ this.method = 'DELETE'; return this; }
      eq(column, value){ this.params.set(column, 'eq.' + String(value)); return this; }
      order(column, options={}){ this.params.set('order', column + '.' + (options.ascending === false ? 'desc' : 'asc')); return this; }
      limit(value){ this.params.set('limit', String(value)); return this; }
      then(resolve, reject){ return this.execute().then(resolve, reject); }
      async execute(){
        try {
          const query = this.params.toString();
          const url = baseUrl + '/rest/v1/' + encodeURIComponent(this.table) + (query ? '?' + query : '');
          const headers = { ...authHeaders };
          const options = { method: this.method, headers };

          if (this.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
            headers.Prefer = 'return=representation';
            if (this.body !== null) options.body = JSON.stringify(this.body);
          }

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

          return { data, error: null };
        } catch (error) {
          return { data: null, error: { message: error && error.message ? error.message : String(error) } };
        }
      }
    }

    window.supabase = {
      createClient(){
        return {
          from(table){ return new QueryBuilder(table); },
          storage: {
            from(bucket){
              return {
                async upload(path, file, options={}){
                  try {
                    const headers = { ...authHeaders, 'x-upsert': options.upsert ? 'true' : 'false' };
                    headers['Content-Type'] = options.contentType || (file && file.type) || 'application/octet-stream';
                    const response = await fetch(baseUrl + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encodePath(path), {
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
                  return { data: { publicUrl: baseUrl + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + encodePath(path) } };
                }
              };
            }
          }
        };
      }
    };

    window.SCHOOL_TIMER_USING_LOCAL_SUPABASE_FALLBACK = true;
    return true;
  }

  async function ensureSupabase(){
    if (hasSupabase()) return true;

    const sources = [
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      'https://unpkg.com/@supabase/supabase-js@2'
    ];

    for (const source of sources) {
      try {
        await loadScript(source);
        if (hasSupabase()) return true;
      } catch (error) {}
    }

    return installRestFallback();
  }

  function showFatal(message){
    const box = document.getElementById('systemStatus');
    if (box) {
      box.style.display = 'block';
      box.className = 'notice err';
      box.textContent = message;
    } else {
      alert(message);
    }
  }

  async function boot(){
    try {
      await loadScript('supabase-config.js?v=optimized-03');
      const ready = await ensureSupabase();
      if (!ready) throw new Error('تعذر إنشاء اتصال Supabase.');
      await loadScript('system-admin.js?v=separate-app-icon-01');
      await loadScript('system-install-link-fix.js?v=install-link-02');
    } catch (error) {
      console.error(error);
      showFatal('تعذر تشغيل اتصال Supabase في لوحة مدير النظام. أعد تحميل الصفحة أو تحقق من الاتصال بالإنترنت.');
    }
  }

  boot();
})();
