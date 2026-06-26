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

      .dashboard-title-host-fixed h1,
      .dashboard-title-host-fixed h2{
        position:absolute!important;
        top:50%!important;
        left:50%!important;
        right:auto!important;
        width:auto!important;
        max-width:80%!important;
        margin:0!important;
        padding:0!important;
        transform:translate(-50%,-50%)!important;
        text-align:center!important;
        white-space:nowrap!important;
        line-height:1!important;
        z-index:4!important;
      }

      .dashboard-title-host-fixed .dashboard-school-name,
      .dashboard-title-host-fixed #dashboardSchoolName{
        display:none!important;
      }

      @media(max-width:768px){
        .dashboard-title-host-fixed h1,
        .dashboard-title-host-fixed h2{
          max-width:76%!important;
          font-size:clamp(22px,6vw,32px)!important;
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
    if (!title || !title.parentElement) return;

    title.parentElement.classList.add('dashboard-title-host-fixed');
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
