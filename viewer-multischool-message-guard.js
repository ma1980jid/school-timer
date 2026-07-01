(function(){
  if (window.__viewerMultischoolMessageGuardLoaded) return;
  window.__viewerMultischoolMessageGuardLoaded = true;

  const slug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  if (slug === 'alsheikh-saif') return;

  function getSchoolName(){
    try {
      const cached = JSON.parse(localStorage.getItem('school_timer_identity_' + slug) || 'null');
      return cached && cached.data && cached.data.school_name ? cached.data.school_name : '';
    } catch (error) { return ''; }
  }

  function replacementText(){
    const name = getSchoolName();
    return name ? 'مرحبًا بكم في ' + name : 'مرحبًا بكم في مدرستكم';
  }

  function cleanTickerText(){
    const replacement = replacementText();
    document.querySelectorAll('.ticker-item, #tickerTrack span').forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('مدرسة الشيخ سيف بن حمد الأغبري')) el.textContent = replacement;
    });
  }

  function cleanCache(){
    try {
      const key = 'school_timer_messages_' + slug;
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached && Array.isArray(cached.messages)) {
        const fixed = cached.messages.map((message) => String(message || '').includes('مدرسة الشيخ سيف بن حمد الأغبري') ? replacementText() : message);
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), messages: fixed }));
      }
      localStorage.removeItem('school_timer_messages_alsheikh-saif');
    } catch (error) {}
  }

  function start(){
    cleanCache();
    cleanTickerText();
    setTimeout(function(){ cleanCache(); cleanTickerText(); }, 700);
    setTimeout(cleanTickerText, 1600);
    setTimeout(cleanTickerText, 3200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
