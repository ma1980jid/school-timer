(function(){
  if (window.__mobileSchoolHeadingLoaded) return;
  window.__mobileSchoolHeadingLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const DEFAULT_NAME = 'مدرسة الشيخ سيف بن حمد الأغبري (5-12) بنين';
  const cacheKey = 'school_timer_settings_' + slug;
  let client = null;

  function ensureStyle(){
    if (document.getElementById('mobileSchoolHeadingStyle')) return;
    const style = document.createElement('style');
    style.id = 'mobileSchoolHeadingStyle';
    style.textContent = `
      .mobile-school-heading{display:none;}
      @media (max-width:768px){
        .mobile-school-heading{
          position:absolute!important;
          top:16.25%!important;
          left:7.5%!important;
          right:7.5%!important;
          height:3.1%!important;
          z-index:32!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          text-align:center!important;
          direction:rtl!important;
          color:#064b35!important;
          font-family:"Diwani Letter","DecoType Naskh","Aref Ruqaa","Geeza Pro","Noto Naskh Arabic","Amiri",Tahoma,serif!important;
          font-size:clamp(15px,4.05vw,25px)!important;
          font-weight:900!important;
          line-height:1.05!important;
          text-shadow:0 1px 0 rgba(255,255,255,.8),0 2px 6px rgba(70,46,9,.16)!important;
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
          pointer-events:none!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureElement(){
    let element = document.getElementById('mobileSchoolHeading');
    if (element) return element;
    const app = document.querySelector('.timer-app');
    if (!app) return null;
    element = document.createElement('div');
    element.id = 'mobileSchoolHeading';
    element.className = 'mobile-school-heading';
    element.textContent = readCachedName() || DEFAULT_NAME;
    const topCards = document.querySelector('.top-cards');
    if (topCards && topCards.parentElement === app) app.insertBefore(element, topCards);
    else app.appendChild(element);
    return element;
  }

  function setName(name){
    const clean = String(name || '').trim();
    if (!clean) return;
    const element = ensureElement();
    if (element && element.textContent !== clean) element.textContent = clean;
  }

  function readCachedName(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.data && cached.data.school_name) return cached.data.school_name;
    } catch (error) {}
    return '';
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL, window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    return client;
  }

  async function loadRemoteName(){
    const db = getClient();
    if (!db) return false;
    try {
      const result = await db.from('schools').select('school_name').eq('school_slug', slug).maybeSingle();
      const name = result && result.data && result.data.school_name;
      if (name) {
        setName(name);
        return true;
      }
    } catch (error) {}
    return false;
  }

  function start(){
    ensureStyle();
    ensureElement();
    const cached = readCachedName();
    if (cached) setName(cached);
    let tries = 0;
    const timer = setInterval(async function(){
      if (await loadRemoteName() || tries++ > 20) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
