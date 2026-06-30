(function(){
  'use strict';

  if (window.__systemAdminSingleDesignCleanupSafeLoaded) return;
  window.__systemAdminSingleDesignCleanupSafeLoaded = true;

  function hideElement(el){
    if(!el || el.dataset.singleDesignHidden === 'true') return;
    el.style.display = 'none';
    el.dataset.singleDesignHidden = 'true';
  }

  function closestBlock(el){
    if(!el) return null;
    return el.closest('.linkbox, .field, .row2, .row3, div');
  }

  function cleanThemeTextFromSchoolCards(){
    document.querySelectorAll('.meta').forEach(function(meta){
      if (meta.dataset.themeLineCleaned === 'true') return;
      const html = meta.innerHTML || '';
      if(html.includes('التصميم:')){
        meta.innerHTML = html
          .replace(/<br>\s*التصميم:[\s\S]*$/g, '')
          .replace(/\n\s*التصميم:[\s\S]*$/g, '');
        meta.dataset.themeLineCleaned = 'true';
      }
    });
  }

  function cleanSystemAdminThemeOptions(){
    try{
      if(!location.pathname.includes('system-admin.html')) return;

      const subtitle = document.querySelector('.topbar p');
      const cleanSubtitle = 'إدارة المدارس، الشعارات، التفعيل، وروابط مؤقت الحصص';
      if(subtitle && subtitle.textContent !== cleanSubtitle){
        subtitle.textContent = cleanSubtitle;
      }

      const themeSelect = document.getElementById('themeStyle');
      if(themeSelect){
        if (themeSelect.value !== 'omani') themeSelect.value = 'omani';
        hideElement(closestBlock(themeSelect));
      }

      document.querySelectorAll('label').forEach(function(label){
        const txt = (label.textContent || '').trim();
        if(txt === 'التصميم الافتراضي' || txt === 'التصميم المستخدم'){
          hideElement(closestBlock(label));
        }
      });

      document.querySelectorAll('.theme-grid').forEach(function(grid){
        hideElement(grid);
        let prev = grid.previousElementSibling;
        while(prev && prev.tagName && prev.tagName.toLowerCase() !== 'h2'){
          prev = prev.previousElementSibling;
        }
        if(prev && (prev.textContent || '').includes('التصاميم')) hideElement(prev);
      });

      document.querySelectorAll('h2').forEach(function(title){
        if((title.textContent || '').includes('التصاميم المعتمدة')) hideElement(title);
      });

      hideElement(document.getElementById('eventThemePanel'));

      document.querySelectorAll('.notice').forEach(function(notice){
        const txt = notice.textContent || '';
        if(txt.includes('تصميم مناسبة') || txt.includes('تصميم المدرسة الأصلي')){
          const panel = notice.closest('#eventThemePanel');
          hideElement(panel || notice);
        }
      });

      cleanThemeTextFromSchoolCards();
    }catch(e){
      console.warn('system admin single design cleanup warning:', e);
    }
  }

  function startCleanup(){
    cleanSystemAdminThemeOptions();
    let runs = 0;
    const timer = setInterval(function(){
      cleanSystemAdminThemeOptions();
      runs += 1;
      if(runs >= 10) clearInterval(timer);
    }, 600);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', startCleanup);
  }else{
    startCleanup();
  }

  window.addEventListener('load', cleanSystemAdminThemeOptions, { once:true });
})();
