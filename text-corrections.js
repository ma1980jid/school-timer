(function(){
  if (window.__schoolTimerTextCorrectionsLoaded) return;
  window.__schoolTimerTextCorrectionsLoaded = true;

  const corrections = new Map([
    ['الحصة الحاليه', 'الحصة الحالية'],
    ['الحصه الحالية', 'الحصة الحالية'],
    ['الحصه الحاليه', 'الحصة الحالية']
  ]);

  function normalizeTextNode(node){
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const value = node.nodeValue;
    if (!value) return;

    let next = value;
    corrections.forEach((correct, wrong) => {
      next = next.split(wrong).join(correct);
    });

    if (next !== value) node.nodeValue = next;
  }

  function walk(root){
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) normalizeTextNode(node);
  }

  function apply(){
    walk(document.body);
  }

  function ensureMobileSchoolHeadingStyle(){
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

  function readSchoolNameFromCache(){
    try {
      const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
      const cached = JSON.parse(localStorage.getItem('school_timer_settings_' + slug) || 'null');
      if (cached && cached.data && cached.data.school_name) return cached.data.school_name;
    } catch (error) {}
    return 'مدرسة الشيخ سيف بن حمد الأغبري (5-12) بنين';
  }

  function ensureMobileSchoolHeading(){
    ensureMobileSchoolHeadingStyle();
    let heading = document.getElementById('mobileSchoolHeading');
    if (!heading) {
      const app = document.querySelector('.timer-app');
      if (!app) return;
      heading = document.createElement('div');
      heading.id = 'mobileSchoolHeading';
      heading.className = 'mobile-school-heading';
      const topCards = document.querySelector('.top-cards');
      if (topCards && topCards.parentElement === app) app.insertBefore(heading, topCards);
      else app.appendChild(heading);
    }
    const schoolName = readSchoolNameFromCache();
    if (schoolName && heading.textContent !== schoolName) heading.textContent = schoolName;
  }

  function start(){
    apply();
    ensureMobileSchoolHeading();
    setInterval(ensureMobileSchoolHeading, 3000);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) normalizeTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) walk(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
