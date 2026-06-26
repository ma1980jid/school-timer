(function(){
  if (window.__schoolTimerDashboardTitleRestoreLoaded) return;
  window.__schoolTimerDashboardTitleRestoreLoaded = true;

  function applyTitleRestoreStyles(){
    let style = document.getElementById('dashboardTitleLayoutFixStyles');

    if (!style) {
      style = document.createElement('style');
      style.id = 'dashboardTitleLayoutFixStyles';
      document.head.appendChild(style);
    }

    style.textContent = `
      .brand{
        display:block!important;
        position:static!important;
        overflow:visible!important;
        min-height:0!important;
        height:auto!important;
      }

      .brand h1{
        display:block!important;
        position:static!important;
        top:auto!important;
        left:auto!important;
        right:auto!important;
        width:auto!important;
        max-width:none!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        transform:none!important;
        text-align:center!important;
        white-space:nowrap!important;
        line-height:1.15!important;
        opacity:1!important;
        visibility:visible!important;
        z-index:auto!important;
      }

      #dashboardSchoolName,
      .dashboard-school-name,
      .dashboard-school-name-fixed{
        display:none!important;
        visibility:hidden!important;
        height:0!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
      }
    `;
  }

  function removeOldTitleClass(){
    document.querySelectorAll('.dashboard-title-host-fixed').forEach((element) => {
      element.classList.remove('dashboard-title-host-fixed');
    });
  }

  function ensureTitleText(){
    const title = [...document.querySelectorAll('h1,h2')].find((item) =>
      item.textContent.replace(/\s+/g, ' ').trim().includes('إدارة مؤقت الحصص')
    );

    if (title) {
      title.textContent = 'إدارة مؤقت الحصص';
      title.style.display = '';
      title.style.visibility = '';
      title.style.opacity = '';
    }
  }

  function start(){
    applyTitleRestoreStyles();
    removeOldTitleClass();
    ensureTitleText();

    setTimeout(() => {
      applyTitleRestoreStyles();
      removeOldTitleClass();
      ensureTitleText();
    }, 300);

    setTimeout(() => {
      applyTitleRestoreStyles();
      removeOldTitleClass();
      ensureTitleText();
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
