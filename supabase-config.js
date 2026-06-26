window.SCHOOL_TIMER_SUPABASE_URL = "https://kzhxmwejyfsuorcdvujb.supabase.co";
window.SCHOOL_TIMER_SUPABASE_ANON_KEY = "sb_publishable_SMJPGEWFq0B0nCyMvu9Sbg_kt7N5hd5";
window.SCHOOL_TIMER_SLUG = "alsheikh-saif";

if (location.pathname.includes('dashboard-v2.html')) {
  const messagesScript = document.createElement('script');
  messagesScript.src = 'dashboard-messages.js?v=messages-admin-06';
  messagesScript.defer = true;
  document.head.appendChild(messagesScript);

  const fixesScript = document.createElement('script');
  fixesScript.src = 'dashboard-v2-fixes.js?v=dashboard-fixes-01';
  fixesScript.defer = true;
  document.head.appendChild(fixesScript);
}
