(function(){
  if (window.__schoolTimerDashboardTitleLayoutFixLoaded) return;
  window.__schoolTimerDashboardTitleLayoutFixLoaded = true;

  function ensureStyles(){
    if (document.getElementById('dashboardTitleLayoutFixStyles')) return;

    const style = document.createElement('style');
    style.id = 'dashboardTitleLayoutFixStyles';
    style.textContent = `
      .dashboard-title-host-fixed{
        position:relative!important;
        overflow:hidden!important;
      }

      .dashboard-title-host-fixed .dashboard-school-name,
      .dashboard-title-host-fixed #dashboardSchoolName{
        position:absolute!important;
        left:0!important;
        right:0!important;
        top:62%!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:0 12px!important;
        line-height:1.25!important;
        text-align:center!important;
        pointer-events:none!important;
        z-index:3!important;
        color:#f7e6b0!important;
        font-size:clamp(15px,1.8vw,22px)!important;
        font-weight:900!important;
        text-shadow:0 1px 2px rgba(0,0,0,.24)!important;
      }

      .dashboard-title-host-fixed h1,
      .dashboard-title-host-fixed h2{
        margin-bottom:0!important;
      }

      @media(max-width:768px){
        .dashboard-title-host-fixed .dashboard-school-name,
        .dashboard-title-host-fixed #dashboardSchoolName{
          top:64%!important;
          font-size:clamp(13px,3.5vw,18px)!important;
          padding:0 8px!important;
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

  function applyFix(){
    ensureStyles();

    const title = findDashboardTitle();
    const subtitle = document.getElementById('dashboardSchoolName');
    if (!title || !subtitle || !title.parentElement) return;

    title.parentElement.classList.add('dashboard-title-host-fixed');
    subtitle.classList.add('dashboard-school-name-fixed');
  }

  function start(){
    applyFix();
    setTimeout(applyFix, 300);
    setTimeout(applyFix, 1000);
    setInterval(applyFix, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
