(function(){
  if(window.__dashboardThemeSettingsDisabledLoaded)return;
  window.__dashboardThemeSettingsDisabledLoaded=true;
  function hideThemeControls(){
    var btn=document.getElementById('themeSettingsButton');
    if(btn) btn.remove();
    document.querySelectorAll('.field').forEach(function(field){
      var label=field.querySelector('label');
      if(label && /نمط الواجهة/.test(label.textContent||'')){
        field.style.display='none';
        field.setAttribute('aria-hidden','true');
      }
    });
  }
  function start(){
    hideThemeControls();
    setInterval(hideThemeControls,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
