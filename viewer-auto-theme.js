(function(){
  if (window.__viewerAutoThemeLoaded) return;
  window.__viewerAutoThemeLoaded = true;

  function applyFixedGreenTheme(){
    document.documentElement.setAttribute('data-theme', 'green');
    document.documentElement.setAttribute('data-theme-effective', 'green');
    document.documentElement.setAttribute('data-theme-source', 'fixed');
    document.documentElement.removeAttribute('data-auto-theme');
    var ribbon = document.getElementById('themeEventRibbon');
    if (ribbon) ribbon.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixedGreenTheme);
  } else {
    applyFixedGreenTheme();
  }
})();
