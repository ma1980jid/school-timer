(function(){
  if(window.__dashboardLegacyThemeHideLoaded)return;
  window.__dashboardLegacyThemeHideLoaded=true;
  function hide(){
    document.querySelectorAll('.field').forEach(function(field){
      var label=field.querySelector('label');
      if(label && /نمط الواجهة/.test(label.textContent||'')){
        field.style.display='none';
        field.setAttribute('aria-hidden','true');
      }
    });
  }
  function start(){hide();setInterval(hide,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
