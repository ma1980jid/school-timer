(function(){
  'use strict';

  function hideMultiThemeOptions(){
    try{
      const labels = Array.from(document.querySelectorAll('label'));
      const themeLabel = labels.find(label => (label.textContent || '').trim() === 'نمط الواجهة');
      if(themeLabel){
        const field = themeLabel.closest('.field');
        if(field){
          field.style.display = 'none';
          field.setAttribute('data-single-design-hidden','true');
        }
      }

      document.querySelectorAll('.theme-grid').forEach(grid => {
        const field = grid.closest('.field');
        if(field){
          field.style.display = 'none';
          field.setAttribute('data-single-design-hidden','true');
        }
      });
    }catch(e){
      console.warn('single design lock warning:', e);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hideMultiThemeOptions);
  }else{
    hideMultiThemeOptions();
  }

  window.addEventListener('load', hideMultiThemeOptions);
  setTimeout(hideMultiThemeOptions, 300);
  setTimeout(hideMultiThemeOptions, 1000);
})();
