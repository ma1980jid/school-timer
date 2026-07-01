(function(){
  if (window.__schoolTimerScriptOptimizationsLoaded) return;
  window.__schoolTimerScriptOptimizationsLoaded = true;

  function preventDefaultSchoolForOtherSchools(){
    const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
    if (slug === 'alsheikh-saif') return;

    function readIdentity(){
      try {
        const cached = JSON.parse(localStorage.getItem('school_timer_identity_' + slug) || 'null');
        return cached && cached.data ? cached.data : null;
      } catch (error) { return null; }
    }

    function logoOf(data){
      return data && (data.app_icon_url || data.logo_url) ? String(data.app_icon_url || data.logo_url).trim() : '';
    }

    function neutralize(){
      const identity = readIdentity();
      const nameText = identity && identity.school_name ? identity.school_name : 'جارٍ تحميل بيانات المدرسة';
      const logoUrl = logoOf(identity);
      const name = document.getElementById('schoolName');
      const vision = document.getElementById('visionText');
      const logo = document.getElementById('schoolLogo');
      const ticker = document.getElementById('tickerTrack');

      if (name && ((name.textContent || '').includes('الشيخ سيف') || name.textContent === '--')) name.textContent = nameText;
      if (vision && (vision.textContent || '').includes('الشيخ سيف')) vision.textContent = '';
      if (logo) {
        const src = logo.getAttribute('src') || '';
        if (logoUrl) {
          logo.src = logoUrl;
          logo.style.display = '';
        } else if (src.includes('icons/school_logo')) {
          logo.removeAttribute('src');
          logo.style.display = 'none';
        }
      }
      if (ticker && (ticker.textContent || '').includes('مدرسة الشيخ سيف بن حمد الأغبري')) ticker.replaceChildren();
    }

    neutralize();
    setTimeout(neutralize, 100);
    setTimeout(neutralize, 500);
    setTimeout(neutralize, 1200);
    setTimeout(neutralize, 2500);
  }

  preventDefaultSchoolForOtherSchools();

  const originalSetText = window.setText;
  if (typeof originalSetText === "function") {
    window.setText = function(id, value) {
      const element = document.getElementById(id);
      if (!element) return;

      const nextValue = value === undefined || value === null ? "" : String(value);
      if (element.textContent !== nextValue) {
        element.textContent = nextValue;
      }
    };
  }

  const originalSetTimeRange = window.setTimeRange;
  if (typeof originalSetTimeRange === "function" && typeof window.periodRange === "function") {
    window.setTimeRange = function(id, period) {
      const element = document.getElementById(id);
      if (!element) return;

      const nextValue = window.periodRange(period);
      if (element.textContent !== nextValue) {
        element.textContent = nextValue;
      }

      if (element.getAttribute("dir") !== "ltr") {
        element.setAttribute("dir", "ltr");
      }
    };
  }

  const originalGetActivePeriods = window.getActivePeriods;
  if (typeof originalGetActivePeriods === "function") {
    let cachedAt = 0;
    let cachedPeriods = null;
    const CACHE_TIME = 5000;

    window.getActivePeriods = function() {
      const now = Date.now();
      if (cachedPeriods && now - cachedAt < CACHE_TIME) {
        return cachedPeriods;
      }

      cachedPeriods = originalGetActivePeriods();
      cachedAt = now;
      return cachedPeriods;
    };
  }
})();
