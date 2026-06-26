(function(){
  if (window.__schoolTimerDashboardLinksCompactFixLoaded) return;
  window.__schoolTimerDashboardLinksCompactFixLoaded = true;

  function ensureStyles(){
    if (document.getElementById('dashboardLinksCompactFixStyles')) return;

    const style = document.createElement('style');
    style.id = 'dashboardLinksCompactFixStyles';
    style.textContent = `
      .left-panel .section{
        padding:6px!important;
      }

      .left-panel .stat-grid{
        gap:5px!important;
        margin-bottom:5px!important;
      }

      .left-panel .stat{
        padding:5px 4px!important;
        border-radius:11px!important;
      }

      .left-panel .stat b{
        font-size:12px!important;
        margin-bottom:1px!important;
      }

      .left-panel .stat span{
        font-size:23px!important;
        line-height:1.05!important;
      }

      .left-panel .actions{
        gap:5px!important;
        margin-bottom:5px!important;
      }

      .left-panel .actions .btn,
      .left-panel .link .btn{
        height:31px!important;
        min-height:31px!important;
        border-radius:10px!important;
        font-size:12px!important;
        line-height:1!important;
      }

      .left-panel .link{
        padding:6px!important;
        margin-bottom:5px!important;
        border-radius:12px!important;
      }

      .left-panel .link b{
        font-size:13px!important;
        line-height:1.25!important;
      }

      .left-panel .url{
        margin:4px 0!important;
        padding:5px 6px!important;
        min-height:42px!important;
        max-height:48px!important;
        overflow:hidden!important;
        font-size:10.5px!important;
        line-height:1.25!important;
        border-radius:9px!important;
      }

      .left-panel{
        overflow:hidden!important;
      }

      .left-panel .panel-title{
        padding-top:7px!important;
        padding-bottom:7px!important;
        font-size:22px!important;
        line-height:1.15!important;
      }

      @media(max-height:760px){
        .left-panel .section{padding:5px!important}
        .left-panel .panel-title{padding-top:6px!important;padding-bottom:6px!important;font-size:21px!important}
        .left-panel .stat{padding:4px!important}
        .left-panel .stat span{font-size:21px!important}
        .left-panel .actions{gap:4px!important}
        .left-panel .actions .btn,.left-panel .link .btn{height:29px!important;min-height:29px!important;font-size:11.5px!important}
        .left-panel .link{padding:5px!important;margin-bottom:4px!important}
        .left-panel .url{min-height:38px!important;max-height:42px!important;font-size:10px!important;line-height:1.2!important}
      }
    `;

    document.head.appendChild(style);
  }

  function start(){
    ensureStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
