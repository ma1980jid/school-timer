(function(){
  if (window.__schoolTimerScriptOptimizationsLoaded) return;
  window.__schoolTimerScriptOptimizationsLoaded = true;

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
