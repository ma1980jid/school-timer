window.SCHOOL_TIMER_SUPABASE_URL = "https://kzhxmwejyfsuorcdvujb.supabase.co";
window.SCHOOL_TIMER_SUPABASE_ANON_KEY = "sb_publishable_SMJPGEWFq0B0nCyMvu9Sbg_kt7N5hd5";
window.SCHOOL_TIMER_SLUG = "alsheikh-saif";

if (location.pathname.includes('dashboard-v2.html')) {
  const script = document.createElement('script');
  script.src = 'dashboard-messages.js?v=messages-admin-01';
  script.defer = true;
  document.head.appendChild(script);
}

if (!location.pathname.includes('dashboard-v2.html')) {
  const tickerScript = document.createElement('script');
  tickerScript.src = 'ticker-messages.js?v=ticker-messages-01';
  tickerScript.defer = true;
  document.head.appendChild(tickerScript);
}
