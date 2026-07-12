(function(){
  if (window.__schoolTimerDashboardCenterSchoolNameLoaded) return;
  window.__schoolTimerDashboardCenterSchoolNameLoaded = true;

  function getSchoolSlug(){
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function getClient(){
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    if (!window.schoolTimerCenterSchoolNameClient) {
      window.schoolTimerCenterSchoolNameClient = window.supabase.createClient(
        window.SCHOOL_TIMER_SUPABASE_URL,
        window.SCHOOL_TIMER_SUPABASE_ANON_KEY
      );
    }
    return window.schoolTimerCenterSchoolNameClient;
  }

  function ensureStyles(){
    if (document.getElementById('dashboardCenterSchoolNameStyles')) return;

    const style = document.createElement('style');
    style.id = 'dashboardCenterSchoolNameStyles';
    style.textContent = `
      .table-tools{
        gap:8px!important;
      }

      .center-school-name-badge{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        max-width:46%!important;
        min-width:0!important;
        height:34px!important;
        padding:0 14px!important;
        margin-inline-start:10px!important;
        margin-inline-end:auto!important;
        border-radius:999px!important;
        background:#f8fafc!important;
        border:1px solid #d7dee8!important;
        color:#0f766e!important;
        font-family:Tahoma,Arial,sans-serif!important;
        font-size:clamp(13px,1.35vw,17px)!important;
        font-weight:900!important;
        line-height:1!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        box-shadow:0 4px 10px rgba(15,23,42,.05)!important;
      }

      @media(max-width:900px){
        .center-school-name-badge{
          max-width:42%!important;
          height:31px!important;
          padding:0 10px!important;
          font-size:12px!important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function findScheduleTitle(){
    return [...document.querySelectorAll('.center-panel .panel-title,h2')].find((item) =>
      item.textContent.replace(/\s+/g, ' ').trim().includes('جدول التواقيت')
    );
  }

  function setSchoolName(name){
    const schoolName = String(name || '').trim() || (getSchoolSlug() === 'alsheikh-saif' ? 'مدرسة الشيخ سيف بن حمد الأغبري' : 'جارٍ تحميل بيانات المدرسة...');
    ensureStyles();

    const title = findScheduleTitle();
    if (!title || !title.parentElement) return false;

    let badge = document.getElementById('centerSchoolNameBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'centerSchoolNameBadge';
      badge.className = 'center-school-name-badge';
      title.insertAdjacentElement('afterend', badge);
    }

    if (badge.textContent !== schoolName) {
      badge.textContent = schoolName;
      badge.title = schoolName;
    }

    return true;
  }

  async function loadSchoolName(){
    setSchoolName(getSchoolSlug() === 'alsheikh-saif' ? 'مدرسة الشيخ سيف بن حمد الأغبري' : 'جارٍ تحميل بيانات المدرسة...');

    const client = getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('schools')
        .select('school_name')
        .eq('school_slug', getSchoolSlug())
        .maybeSingle();

      if (!error && data && data.school_name) {
        setSchoolName(data.school_name);
      }
    } catch (error) {}
  }

  function start(){
    loadSchoolName();
    setTimeout(loadSchoolName, 500);
    setTimeout(loadSchoolName, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
