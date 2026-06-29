(function(){
  if (window.__schoolTimerDashboardMessagesLoaded) return;
  window.__schoolTimerDashboardMessagesLoaded = true;

  const DEFAULT_MESSAGES = [
    'مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري',
    'العلم نور',
    'الانضباط طريق النجاح',
    'نسعى لبناء مستقبل تعليمي متميز'
  ];

  const SYSTEM_MARKERS = [
    '__CARD_',
    '__SCHEDULED__:',
    '__SCHEDULE_ROWS__:',
    '__ALERT_SETTINGS__:',
    '__GLOBAL_EVENT_THEME__:',
    '__AUTO_THEME__:'
  ];

  const $ = (id) => document.getElementById(id);
  let isSavingMessages = false;

  function isSystemMessage(message){
    const text = String(message || '').trim();
    return SYSTEM_MARKERS.some((marker) => text.startsWith(marker) || text.includes(marker));
  }

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.schoolTimerMessagesClient) {
      window.schoolTimerMessagesClient = window.supabase.createClient(
        window.SCHOOL_TIMER_SUPABASE_URL,
        window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      );
    }
    return window.schoolTimerMessagesClient;
  }

  function cleanMessages(messages){
    return (Array.isArray(messages) ? messages : [])
      .map((message) => String(message || '').trim())
      .filter(Boolean)
      .filter((message) => !isSystemMessage(message));
  }

  function mergeMessages(){
    const seen = new Set();
    const merged = [];
    Array.from(arguments).flat().forEach((message) => {
      const text = String(message || '').trim();
      if (!text || seen.has(text) || isSystemMessage(text)) return;
      seen.add(text);
      merged.push(text);
    });
    return merged;
  }

  function writeTickerCache(messages){
    try {
      localStorage.setItem('school_timer_messages_' + getSchoolSlug(), JSON.stringify({
        savedAt: Date.now(),
        messages: cleanMessages(messages)
      }));
    } catch (error) {}
  }

  function toastMsg(text){
    const toast = $('toast');
    if (!toast) return alert(text);
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function ensureStyles(){
    if ($('messagesAdminStyles')) return;
    const style = document.createElement('style');
    style.id = 'messagesAdminStyles';
    style.textContent = `
      .messages-list{display:grid;gap:8px;margin:10px 0;max-height:52vh;overflow:auto;padding-left:4px}
      .message-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
      .message-row textarea{width:100%;min-height:48px;resize:vertical;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:900;line-height:1.5;color:#0f172a;outline:none}
      .message-row textarea:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.12)}
      .msg-note{margin:0;color:#64748b;font-weight:900;line-height:1.8}
      .dialog-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}
    `;
    document.head.appendChild(style);
  }

  function createMessageRow(text=''){
    const row = document.createElement('div');
    row.className = 'message-row';

    const area = document.createElement('textarea');
    area.className = 'messageInput';
    area.value = text;
    area.placeholder = 'اكتب الرسالة هنا';

    const del = document.createElement('button');
    del.className = 'mini del';
    del.type = 'button';
    del.textContent = 'حذف';
    del.onclick = () => row.remove();

    row.append(area, del);
    return row;
  }

  function addMessageInput(text=''){
    const list = $('messagesList');
    if (!list) return;
    list.appendChild(createMessageRow(text));
  }

  async function loadNewMessages(client, schoolSlug){
    try {
      const { data, error } = await client
        .from('school_display_messages')
        .select('message_text,sort_order,target_area,message_type')
        .eq('school_slug', schoolSlug)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data || !data.length) return [];

      return cleanMessages(
        data
          .filter((row) => ['ticker','all'].includes(String(row.target_area || 'ticker')))
          .map((row) => row.message_text)
      );
    } catch (error) {
      return [];
    }
  }

  async function loadMessagesDialog(){
    const list = $('messagesList');
    if (!list) return;
    list.replaceChildren();

    let messages = [];
    const client = getClient();
    const schoolSlug = getSchoolSlug();

    if (client) {
      messages = await loadNewMessages(client, schoolSlug);
    }

    const finalMessages = cleanMessages(messages).length ? cleanMessages(messages) : DEFAULT_MESSAGES;
    const fragment = document.createDocumentFragment();
    finalMessages.forEach((message) => fragment.appendChild(createMessageRow(message)));
    list.replaceChildren(fragment);
  }

  async function openMessages(){
    ensureDialog();
    const dialog = $('messagesDialog');
    if (dialog) dialog.classList.add('show');
    await loadMessagesDialog();
  }

  function closeMessages(){
    const dialog = $('messagesDialog');
    if (dialog) dialog.classList.remove('show');
  }

  function requireAdminCode(){
    const schoolSlug = getSchoolSlug();
    let code = sessionStorage.getItem('school_timer_admin_code_' + schoolSlug) || '';
    if (code) return code;
    code = prompt('أدخل رمز الإدارة الخاص بالمدرسة');
    return code ? code.trim() : '';
  }

  async function saveNewDisplayMessages(client, schoolSlug, messages){
    await client
      .from('school_display_messages')
      .delete()
      .eq('school_slug', schoolSlug)
      .eq('message_type', 'ticker')
      .eq('target_area', 'ticker');

    const displayRows = messages.map((message_text, i) => ({
      school_slug: schoolSlug,
      message_text,
      message_type: 'ticker',
      target_area: 'ticker',
      sort_order: i + 1,
      is_active: true
    }));

    if (!displayRows.length) return null;

    const { error } = await client
      .from('school_display_messages')
      .insert(displayRows);

    return error || null;
  }

  async function saveLog(client, schoolSlug, messages){
    try {
      await client.from('system_logs').insert({
        actor_type: 'school_admin',
        actor_name: 'school-dashboard',
        school_slug: schoolSlug,
        action: 'save_display_messages',
        entity_type: 'school_display_messages',
        new_data: { messages_count: messages.length },
        details: 'تم حفظ الرسائل في school_display_messages.'
      });
    } catch (error) {}
  }

  async function saveMessages(){
    if (isSavingMessages) return;

    const client = getClient();
    const schoolSlug = getSchoolSlug();
    if (!client) return toastMsg('لم يتم ضبط اتصال Supabase');

    const code = requireAdminCode();
    if (!code) return toastMsg('لم يتم إدخال رمز الإدارة');

    const messages = cleanMessages([...document.querySelectorAll('.messageInput')].map((x) => x.value));
    if (!messages.length) return toastMsg('أضف رسالة واحدة على الأقل');

    const saveBtn = $('saveMessagesBtn');
    isSavingMessages = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'جارٍ الحفظ...';
    }

    try {
      const { data: ok, error: authError } = await client
        .from('schools')
        .select('school_slug')
        .eq('school_slug', schoolSlug)
        .eq('admin_code', code)
        .maybeSingle();

      if (authError || !ok) {
        sessionStorage.removeItem('school_timer_admin_code_' + schoolSlug);
        return toastMsg('رمز الإدارة غير صحيح');
      }

      const newError = await saveNewDisplayMessages(client, schoolSlug, messages);
      if (newError) return toastMsg('تعذر حفظ الرسائل');

      await saveLog(client, schoolSlug, messages);
      sessionStorage.setItem('school_timer_admin_code_' + schoolSlug, code);
      writeTickerCache(messages);
      toastMsg('تم حفظ الرسائل بنجاح');
    } finally {
      isSavingMessages = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ الرسائل';
      }
    }
  }

  function ensureDialog(){
    ensureStyles();
    if ($('messagesDialog')) return;

    const dialog = document.createElement('div');
    dialog.id = 'messagesDialog';
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <div>
        <h3>إدارة الرسائل</h3>
        <p class="msg-note">تظهر هذه الرسائل في الشريط السفلي لشاشة الحاسوب والهاتف، ويتم حفظها لهذه المدرسة فقط.</p>
        <div id="messagesList" class="messages-list"></div>
        <div class="dialog-actions">
          <button class="btn light" type="button" id="addMessageBtn">إضافة رسالة</button>
          <button class="btn navy" type="button" id="saveMessagesBtn">حفظ الرسائل</button>
          <button class="btn" type="button" id="closeMessagesBtn">إغلاق</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    $('addMessageBtn').onclick = () => addMessageInput();
    $('saveMessagesBtn').onclick = saveMessages;
    $('closeMessagesBtn').onclick = closeMessages;
  }

  function addButton(){
    if ($('messagesAdminBtn')) return;
    const actions = document.querySelector('.actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.id = 'messagesAdminBtn';
    btn.className = 'btn light';
    btn.type = 'button';
    btn.textContent = 'إدارة الرسائل';
    btn.onclick = openMessages;

    const guideBtn = [...actions.querySelectorAll('button')].find((b) => b.textContent.includes('دليل المستخدم'));
    actions.insertBefore(btn, guideBtn || null);
  }

  function init(){
    addButton();
    setTimeout(addButton, 800);
    setTimeout(addButton, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
