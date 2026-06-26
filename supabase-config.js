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
}
