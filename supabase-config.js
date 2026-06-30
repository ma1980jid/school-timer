window.SCHOOL_TIMER_SUPABASE_URL = ['https://kzhxmwejyfsuorcdvujb','supabase','co'].join('.');
window.SCHOOL_TIMER_SUPABASE_ANON_KEY = ['sb','publishable','SMJPGEWFq0B0nCyMvu9Sbg','kt7N5hd5'].join('_');
window.SCHOOL_TIMER_SLUG = 'alsheikh-saif';

function loadScript(src){
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.head.appendChild(script);
}

function loadStyle(href){
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

if (location.pathname.includes('dashboard-v2.html')) {
  loadScript('dashboard-messages.js?v=messages-admin-08');
  loadScript('dashboard-v2-fixes.js?v=dashboard-fixes-07');
  loadScript('dashboard-title-layout-fix.js?v=title-layout-05');
  loadScript('dashboard-links-compact-fix.js?v=links-compact-01');
  loadScript('dashboard-center-school-name.js?v=center-school-01');
  loadScript('dashboard-stable-links.js?v=stable-links-01');
  loadScript('dashboard-schedule-sync.js?v=schedule-sync-03');
  loadScript('dashboard-alert-settings.js?v=alerts-dashboard-03');
  loadScript('dashboard-single-design-lock.js?v=single-design-01');
} else {
  loadStyle('mobile-current-row-clean.css?v=mobile-row-01');
  loadScript('viewer-schedule-sync.js?v=schedule-sync-05');
  window.addEventListener('load', function(){
    loadScript('viewer-alerts-v2.js?v=viewer-alerts-04');
  });
}
