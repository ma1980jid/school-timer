(function(){
  if (window.__pwaSchoolRedirectLoaded) return;
  window.__pwaSchoolRedirectLoaded = true;

  const params = new URLSearchParams(location.search);
  const currentSchool = params.get('school') || '';
  const currentView = params.get('view') || '';

  function safeSlug(value){
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/\-+/g, '-').replace(/^\-+|\-+$/g, '');
  }

  function rememberSchool(slug){
    slug = safeSlug(slug);
    if (!slug) return;
    try {
      localStorage.setItem('school_timer_preferred_school', slug);
      sessionStorage.setItem('school_timer_current_school', slug);
    } catch (error) {}
  }

  function getPreferredSchool(){
    try {
      return safeSlug(sessionStorage.getItem('school_timer_current_school') || localStorage.getItem('school_timer_preferred_school') || '');
    } catch (error) { return ''; }
  }

  function redirectTo(slug){
    slug = safeSlug(slug);
    if (!slug) return;
    const next = new URL(location.href);
    next.searchParams.set('school', slug);
    if (!next.searchParams.get('view')) next.searchParams.set('view', currentView || 'mobile');
    next.searchParams.set('pwa', '1');
    if (next.href !== location.href) location.replace(next.href);
  }

  const preferred = getPreferredSchool();

  if (currentSchool) {
    const normalizedCurrent = safeSlug(currentSchool);
    if (preferred && preferred !== normalizedCurrent && normalizedCurrent === 'alsheikh-saif') {
      redirectTo(preferred);
      return;
    }
    rememberSchool(normalizedCurrent);
    return;
  }

  if (preferred) redirectTo(preferred);
})();
