(function(){
  if (window.__schoolTimerDashboardV2FixesLoaded) return;
  window.__schoolTimerDashboardV2FixesLoaded = true;

  const RIGHT_PREFIX = '__CARD_RIGHT__:';
  const LEFT_PREFIX = '__CARD_LEFT__:';
  const ANNOUNCEMENT_HINT = 'مساحة مخصصة لعرض إعلانات المدرسة، والمناشط، والفعاليات، والتنبيهات المهمة';
  let isSavingSettings = false;
  let isSavingCards = false;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.schoolTimerDashboardFixesClient) {
      window.schoolTimerDashboardFixesClient = window.supabase.createClient(
        window.SCHOOL_TIMER_SUPABASE_URL,
        window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      );
    }
    return window.schoolTimerDashboardFixesClient;
  }

  function hideDeprecatedControls(){
    document.querySelectorAll('.field').forEach((field) => {
      const label = field.querySelector('label');
      const text = label ? label.textContent || '' : '';
      if (/نمط الواجهة/.test(text)) {
        field.style.display = 'none';
        field.setAttribute('aria-hidden', 'true');
      }
    });
    document.querySelectorAll('button').forEach((button) => {
      const text = (button.textContent || '').trim();
      if (/الإعلانات المجدولة|إدارة التصاميم/.test(text)) {
        button.remove();
      }
    });
  }

  function ensureDashboardSchoolNameStyles(){
    if (document.getElementById('dashboardSchoolNameStyles')) return;

    const style = document.createElement('style');
    style.id = 'dashboardSchoolNameStyles';
    style.textContent = `
      .dashboard-school-name{
        display:block;
        width:100%;
        margin:-6px auto 12px;
        padding:0 16px 10px;
        text-align:center;
        color:#f7e6b0;
        font-family:Tahoma,Arial,sans-serif;
        font-size:clamp(17px,2.15vw,25px);
        font-weight:900;
        line-height:1.7;
        letter-spacing:0;
        text-shadow:0 1px 2px rgba(0,0,0,.22);
      }
      @media(max-width:768px){
        .dashboard-school-name{
          margin:-3px auto 10px;
          padding:0 10px 8px;
          font-size:clamp(15px,4vw,20px);
          line-height:1.6;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findDashboardTitle(){
    return [...document.querySelectorAll('h1,h2')].find((title) =>
      title.textContent.replace(/\s+/g, ' ').trim().includes('إدارة مؤقت الحصص')
    ) || document.querySelector('h1');
  }

  function setDashboardSchoolName(name){
    const schoolName = String(name || '').trim() || 'مدرسة الشيخ سيف بن حمد الأغبري';
    ensureDashboardSchoolNameStyles();

    const title = findDashboardTitle();
    if (!title) return false;

    let subtitle = document.getElementById('dashboardSchoolName');
    if (!subtitle) {
      subtitle = document.createElement('div');
      subtitle.id = 'dashboardSchoolName';
      subtitle.className = 'dashboard-school-name';
      title.insertAdjacentElement('afterend', subtitle);
    }

    if (subtitle.textContent !== schoolName) {
      subtitle.textContent = schoolName;
    }

    return true;
  }

  async function loadDashboardSchoolName(){
    if (!setDashboardSchoolName('مدرسة الشيخ سيف بن حمد الأغبري')) return;

    const client = getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('schools')
        .select('school_name')
        .eq('school_slug', getSchoolSlug())
        .maybeSingle();

      if (!error && data && data.school_name) {
        setDashboardSchoolName(data.school_name);
      }
    } catch (error) {}
  }

  function buildViewUrl(view){
    const origin = location.origin;
    const basePath = location.pathname.replace(/dashboard-v2\.html$/, 'index.html');
    const params = new URLSearchParams({
      school: getSchoolSlug(),
      view,
      v: '15'
    });

    return `${origin}${basePath}?${params.toString()}`;
  }

  function updateLink(id, view){
    const element = document.getElementById(id);
    if (!element) return;

    const url = buildViewUrl(view);
    if (element.textContent !== url) {
      element.textContent = url;
    }
  }

  function refreshLinks(){
    updateLink('desktopUrl', 'desktop');
    updateLink('mobileUrl', 'mobile');
  }

  function toastMsg(text){
    const toast = document.getElementById('toast');
    if (!toast) return alert(text);
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function requireAdminCode(){
    const schoolSlug = getSchoolSlug();
    let code = sessionStorage.getItem('school_timer_admin_code_' + schoolSlug) || '';
    if (code) return code;
    code = prompt('أدخل رمز الإدارة الخاص بالمدرسة');
    return code ? code.trim() : '';
  }

  function findSaveButton(){
    return [...document.querySelectorAll('button')].find((button) =>
      button.textContent.trim() === 'حفظ الإعدادات'
    );
  }

  function protectSaveButton(){
    const button = findSaveButton();
    if (!button || button.dataset.saveProtected === '1') return;

    button.dataset.saveProtected = '1';

    button.addEventListener('click', () => {
      if (isSavingSettings) return;

      isSavingSettings = true;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'جارٍ الحفظ...';

      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
        isSavingSettings = false;
        refreshLinks();
        loadDashboardSchoolName();
      }, 1800);
    }, true);
  }

  function ensureCardDialogStyles(){
    if (document.getElementById('middleCardsStyles')) return;
    const style = document.createElement('style');
    style.id = 'middleCardsStyles';
    style.textContent = `
      .card-admin-fields{display:grid;gap:12px;margin:12px 0}
      .card-admin-field label{display:block;color:#64748b;font-weight:900;margin-bottom:6px;text-align:right}
      .card-admin-field textarea{width:100%;min-height:76px;resize:vertical;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-family:Tahoma,Arial,sans-serif;font-size:16px;font-weight:900;line-height:1.6;color:#0f172a;outline:none;text-align:center}
      .card-admin-field textarea:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.12)}
      .card-admin-note{margin:0;color:#64748b;font-weight:900;line-height:1.8}
    `;
    document.head.appendChild(style);
  }

  function ensureCardDialog(){
    ensureCardDialogStyles();
    if (document.getElementById('middleCardsDialog')) return;

    const dialog = document.createElement('div');
    dialog.id = 'middleCardsDialog';
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <div>
        <h3>إعلانات المدرسة</h3>
        <p class="card-admin-note">${ANNOUNCEMENT_HINT}</p>
        <div class="card-admin-fields">
          <div class="card-admin-field">
            <label for="rightCardInput">الصندوق الأيمن</label>
            <textarea id="rightCardInput" placeholder="${ANNOUNCEMENT_HINT}"></textarea>
          </div>
          <div class="card-admin-field">
            <label for="leftCardInput">الصندوق الأيسر</label>
            <textarea id="leftCardInput" placeholder="${ANNOUNCEMENT_HINT}"></textarea>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn navy" type="button" id="saveMiddleCardsBtn">حفظ</button>
          <button class="btn" type="button" id="closeMiddleCardsBtn">إغلاق</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document.getElementById('saveMiddleCardsBtn').onclick = saveMiddleCards;
    document.getElementById('closeMiddleCardsBtn').onclick = closeMiddleCards;
  }

  function parseCards(rows){
    const cards = { right: '', left: '' };
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const text = String(row && row.message_text || '');
      if (text.startsWith(RIGHT_PREFIX)) cards.right = text.slice(RIGHT_PREFIX.length).trim();
      if (text.startsWith(LEFT_PREFIX)) cards.left = text.slice(LEFT_PREFIX.length).trim();
    });
    return cards;
  }

  async function loadMiddleCards(){
    const client = getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('school_messages')
        .select('message_text,sort_order')
        .eq('school_slug', getSchoolSlug())
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return;
      const cards = parseCards(data);
      const right = document.getElementById('rightCardInput');
      const left = document.getElementById('leftCardInput');
      if (right && cards.right) right.value = cards.right;
      if (left && cards.left) left.value = cards.left;
    } catch (error) {}
  }

  async function openMiddleCards(){
    ensureCardDialog();
    const dialog = document.getElementById('middleCardsDialog');
    if (dialog) dialog.classList.add('show');
    await loadMiddleCards();
  }

  function closeMiddleCards(){
    const dialog = document.getElementById('middleCardsDialog');
    if (dialog) dialog.classList.remove('show');
  }

  function writeCardsCache(cards){
    try {
      localStorage.setItem('school_timer_middle_cards_' + getSchoolSlug(), JSON.stringify({
        savedAt: Date.now(),
        cards
      }));
    } catch (error) {}
  }

  async function saveMiddleCards(){
    if (isSavingCards) return;

    const client = getClient();
    if (!client) return toastMsg('لم يتم ضبط اتصال Supabase');

    const code = requireAdminCode();
    if (!code) return toastMsg('لم يتم إدخال رمز الإدارة');

    const right = String(document.getElementById('rightCardInput')?.value || '').trim();
    const left = String(document.getElementById('leftCardInput')?.value || '').trim();

    if (!right && !left) return toastMsg('أضف نصًا واحدًا على الأقل');

    const saveBtn = document.getElementById('saveMiddleCardsBtn');
    isSavingCards = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'جارٍ الحفظ...';
    }

    try {
      const schoolSlug = getSchoolSlug();
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

      const { error: delError } = await client
        .from('school_messages')
        .delete()
        .eq('school_slug', schoolSlug)
        .like('message_text', '__CARD_%');

      if (delError) return toastMsg('تعذر تحديث الإعلانات');

      const rows = [];
      if (right) rows.push({ school_slug: schoolSlug, message_text: RIGHT_PREFIX + right, is_active: true, sort_order: 9001 });
      if (left) rows.push({ school_slug: schoolSlug, message_text: LEFT_PREFIX + left, is_active: true, sort_order: 9002 });

      if (rows.length) {
        const { error: insError } = await client.from('school_messages').insert(rows);
        if (insError) return toastMsg('تعذر حفظ الإعلانات');
      }

      sessionStorage.setItem('school_timer_admin_code_' + schoolSlug, code);
      writeCardsCache({ right, left });
      toastMsg('تم الحفظ بنجاح');
      refreshLinks();
    } finally {
      isSavingCards = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ';
      }
    }
  }

  function addMiddleCardsButton(){
    if (document.getElementById('middleCardsAdminBtn')) return;
    const actions = document.querySelector('.actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.id = 'middleCardsAdminBtn';
    btn.className = 'btn light';
    btn.type = 'button';
    btn.textContent = 'إعلانات المدرسة';
    btn.onclick = openMiddleCards;

    const messagesBtn = document.getElementById('messagesAdminBtn');
    actions.insertBefore(btn, messagesBtn || null);
  }

  function start(){
    hideDeprecatedControls();
    loadDashboardSchoolName();
    refreshLinks();
    protectSaveButton();
    addMiddleCardsButton();
    setInterval(hideDeprecatedControls, 1500);
    setTimeout(loadDashboardSchoolName, 400);
    setTimeout(loadDashboardSchoolName, 1200);
    setTimeout(refreshLinks, 300);
    setTimeout(refreshLinks, 1000);
    setTimeout(protectSaveButton, 1000);
    setTimeout(addMiddleCardsButton, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
