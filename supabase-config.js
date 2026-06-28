window.SCHOOL_TIMER_SUPABASE_URL = "https://kzhxmwejyfsuorcdvujb.supabase.co";
window.SCHOOL_TIMER_SUPABASE_ANON_KEY = "sb_publishable_" + "SMJPGEWFq0B0nCyMvu9Sbg_kt7N5hd5";
window.SCHOOL_TIMER_SLUG = "alsheikh-saif";

if (location.pathname.includes('dashboard-v2.html')) {
  const messagesScript = document.createElement('script');
  messagesScript.src = 'dashboard-messages.js?v=messages-admin-08';
  messagesScript.defer = true;
  document.head.appendChild(messagesScript);

  const fixesScript = document.createElement('script');
  fixesScript.src = 'dashboard-v2-fixes.js?v=dashboard-fixes-07';
  fixesScript.defer = true;
  document.head.appendChild(fixesScript);

  const titleLayoutScript = document.createElement('script');
  titleLayoutScript.src = 'dashboard-title-layout-fix.js?v=title-layout-05';
  titleLayoutScript.defer = true;
  document.head.appendChild(titleLayoutScript);

  const linksCompactScript = document.createElement('script');
  linksCompactScript.src = 'dashboard-links-compact-fix.js?v=links-compact-01';
  linksCompactScript.defer = true;
  document.head.appendChild(linksCompactScript);

  const centerSchoolNameScript = document.createElement('script');
  centerSchoolNameScript.src = 'dashboard-center-school-name.js?v=center-school-01';
  centerSchoolNameScript.defer = true;
  document.head.appendChild(centerSchoolNameScript);

  const stableLinksScript = document.createElement('script');
  stableLinksScript.src = 'dashboard-stable-links.js?v=stable-links-01';
  stableLinksScript.defer = true;
  document.head.appendChild(stableLinksScript);

  const dashboardScheduleSync = document.createElement('script');
  dashboardScheduleSync.src = 'dashboard-schedule-sync.js?v=schedule-sync-03';
  dashboardScheduleSync.defer = true;
  document.head.appendChild(dashboardScheduleSync);

  const dashboardAlerts = document.createElement('script');
  dashboardAlerts.src = 'dashboard-alert-settings.js?v=alerts-dashboard-02';
  dashboardAlerts.defer = true;
  document.head.appendChild(dashboardAlerts);
} else {
  const mobileCurrentRowStyle = document.createElement('link');
  mobileCurrentRowStyle.rel = 'stylesheet';
  mobileCurrentRowStyle.href = 'mobile-current-row-clean.css?v=mobile-row-01';
  document.head.appendChild(mobileCurrentRowStyle);

  window.addEventListener('load', function(){
    const viewerScheduleSync = document.createElement('script');
    viewerScheduleSync.src = 'viewer-schedule-sync.js?v=schedule-sync-03';
    viewerScheduleSync.defer = true;
    document.head.appendChild(viewerScheduleSync);

    const viewerAlerts = document.createElement('script');
    viewerAlerts.src = 'viewer-alerts-v2.js?v=viewer-alerts-02';
    viewerAlerts.defer = true;
    document.head.appendChild(viewerAlerts);
  });
}
