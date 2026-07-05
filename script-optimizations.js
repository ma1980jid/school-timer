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

  function normalizeTimerText(id, value){
    const text = value === undefined || value === null ? '' : String(value);
    if (id === 'currentName' && text.trim() === 'انتهى الدوام') return '--';
    return text;
  }

  function clearAfterSchoolText(){
    const currentName = document.getElementById('currentName');
    if (currentName && currentName.textContent.trim() === 'انتهى الدوام') currentName.textContent = '--';
  }

  preventDefaultSchoolForOtherSchools();

  const originalSetText = window.setText;
  if (typeof originalSetText === "function") {
    window.setText = function(id, value) {
      const element = document.getElementById(id);
      if (!element) return;

      const nextValue = normalizeTimerText(id, value);
      if (element.textContent !== nextValue) {
        element.textContent = nextValue;
      }
    };
  }

  const originalUpdateCards = window.updateCards;
  if (typeof originalUpdateCards === "function") {
    window.updateCards = function(scheduleState) {
      const s = scheduleState || (typeof window.getSchedule === 'function' ? window.getSchedule() : null);
      if (!s) return originalUpdateCards(scheduleState);

      window.setText('previousName', s.previous ? s.previous.name : '--');
      window.setTimeRange('previousTime', s.previous);

      if (s.current) {
        window.setText('currentName', s.current.name);
        window.setTimeRange('currentTime', s.current);
      } else if (s.beforeSchool) {
        window.setText('currentName', '--');
        window.setTimeRange('currentTime', s.first);
      } else if (s.afterSchool) {
        window.setText('currentName', '--');
        window.setTimeRange('currentTime', null);
      } else {
        window.setText('currentName', 'لا توجد حصة');
        window.setTimeRange('currentTime', null);
      }

      window.setText('nextName', s.next ? s.next.name : '--');
      window.setTimeRange('nextTime', s.next);
    };
  }

  const originalUpdateRemaining = window.updateRemaining;
  if (typeof originalUpdateRemaining === "function") {
    window.updateRemaining = function(scheduleState) {
      const s = scheduleState || (typeof window.getSchedule === 'function' ? window.getSchedule() : null);
      if (!s || !s.afterSchool) return originalUpdateRemaining(scheduleState);

      window.setText('countLabel', 'انتهى اليوم الدراسي');
      window.setText('remainingTime', '00:00');
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

  clearAfterSchoolText();
  setTimeout(clearAfterSchoolText, 50);
  setTimeout(clearAfterSchoolText, 250);
  setTimeout(clearAfterSchoolText, 1000);
})();
