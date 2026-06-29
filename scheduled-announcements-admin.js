(function(){
  if (window.__schoolTimerScheduledAnnouncementsDisabledLoaded) return;
  window.__schoolTimerScheduledAnnouncementsDisabledLoaded = true;

  function removeScheduledAnnouncementsControls(){
    document.querySelectorAll('button').forEach(function(button){
      if (/الإعلانات المجدولة|إضافة مناسبة|حفظ الإعلانات المجدولة/.test(button.textContent || '')) {
        button.remove();
      }
    });
    var dialog = document.getElementById('scheduledAnnouncementsDialog');
    if (dialog) dialog.remove();
  }

  function start(){
    removeScheduledAnnouncementsControls();
    setInterval(removeScheduledAnnouncementsControls, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
