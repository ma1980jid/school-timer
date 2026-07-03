(function(){
  if (window.__afterSchoolLabelFixLoaded) return;
  window.__afterSchoolLabelFixLoaded = true;

  var END_DAWAM = '\u0627\u0646\u062a\u0647\u0649 \u0627\u0644\u062f\u0648\u0627\u0645';
  var END_DAY = '\u0627\u0646\u062a\u0647\u0649 \u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u062f\u0631\u0627\u0633\u064a';

  function textValue(value){
    return value === undefined || value === null ? '' : String(value);
  }

  var previousSetText = window.setText;
  window.setText = function(id, value){
    var element = document.getElementById(id);
    if (!element) {
      if (typeof previousSetText === 'function') previousSetText(id, value);
      return;
    }

    var nextValue = textValue(value);
    if (id === 'currentName' && nextValue.trim() === END_DAWAM) nextValue = '--';

    if (element.textContent !== nextValue) element.textContent = nextValue;
  };

  var previousUpdateRemaining = window.updateRemaining;
  window.updateRemaining = function(scheduleState){
    var s = scheduleState || (typeof window.getSchedule === 'function' ? window.getSchedule() : null);
    if (s && s.afterSchool) {
      window.setText('countLabel', END_DAY);
      window.setText('remainingTime', '00:00');
      return;
    }

    if (typeof previousUpdateRemaining === 'function') return previousUpdateRemaining(scheduleState);
  };

  function apply(){
    var currentName = document.getElementById('currentName');
    if (currentName && currentName.textContent.trim() === END_DAWAM) currentName.textContent = '--';

    if (typeof window.getSchedule === 'function') {
      var s = window.getSchedule();
      if (s && s.afterSchool) {
        window.setText('countLabel', END_DAY);
        window.setText('remainingTime', '00:00');
      }
    }
  }

  apply();
  setTimeout(apply, 100);
  setTimeout(apply, 500);
  setInterval(apply, 1500);
})();
