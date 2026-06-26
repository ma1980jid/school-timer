(function(){
  if (window.__schoolTimerEmojiRenderFixLoaded) return;
  window.__schoolTimerEmojiRenderFixLoaded = true;

  const EMOJI_PATTERN = /(🇴🇲|📌|📍|❤️|❤|🗡️|🗡|⚔️|⚔)/gu;

  function ensureStyles(){
    if (document.getElementById('emojiRenderFixStyles')) return;

    const style = document.createElement('style');
    style.id = 'emojiRenderFixStyles';
    style.textContent = `
      .safe-emoji{display:inline-flex;align-items:center;justify-content:center;vertical-align:-.12em;margin-inline:.16em;flex:0 0 auto}
      .safe-emoji-flag-om{width:1.48em;height:.96em;border-radius:.12em;overflow:hidden;border:1px solid rgba(15,23,42,.22);box-shadow:0 .05em .18em rgba(15,23,42,.22);background:linear-gradient(90deg,#d71920 0 30%,transparent 30% 100%),linear-gradient(180deg,#fff 0 33.33%,#d71920 33.33% 66.66%,#007a3d 66.66% 100%)}
      .safe-emoji-pin{width:.86em;height:.86em;background:#dc2626;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 .04em .12em rgba(15,23,42,.22)}
      .safe-emoji-pin::after{content:"";width:.28em;height:.28em;background:#fff;border-radius:50%;display:block}
      .safe-emoji-heart::before{content:"❤";color:#e11d48;font-family:Arial,"Segoe UI Symbol",sans-serif;font-weight:900;line-height:1;text-shadow:0 .04em .08em rgba(15,23,42,.22)}
      .safe-emoji-sword::before{content:"⚔";color:#334155;font-family:"Segoe UI Symbol",Arial,sans-serif;font-weight:900;line-height:1;text-shadow:0 .04em .08em rgba(15,23,42,.18)}
      .ticker-item .safe-emoji-flag-om{font-size:1.05em}
      .school-name-card .safe-emoji,.vision-card .safe-emoji{font-size:.82em;margin-inline:.12em}
    `;

    document.head.appendChild(style);
  }

  function iconFor(token){
    const icon = document.createElement('span');
    icon.className = 'safe-emoji';
    icon.setAttribute('role', 'img');

    if (token === '🇴🇲') {
      icon.classList.add('safe-emoji-flag-om');
      icon.setAttribute('aria-label', 'علم عمان');
      return icon;
    }

    if (token === '📌' || token === '📍') {
      icon.classList.add('safe-emoji-pin');
      icon.setAttribute('aria-label', 'تنبيه');
      return icon;
    }

    if (token === '❤' || token === '❤️') {
      icon.classList.add('safe-emoji-heart');
      icon.setAttribute('aria-label', 'قلب');
      return icon;
    }

    icon.classList.add('safe-emoji-sword');
    icon.setAttribute('aria-label', 'رمز');
    return icon;
  }

  function renderText(text){
    const fragment = document.createDocumentFragment();
    const parts = String(text || '').split(EMOJI_PATTERN).filter((part) => part !== '');

    parts.forEach((part) => {
      if (part.match(EMOJI_PATTERN)) {
        fragment.appendChild(iconFor(part));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    return fragment;
  }

  function enhanceElement(element){
    if (!element || element.querySelector('.safe-emoji')) return;

    const text = element.textContent || '';
    if (!EMOJI_PATTERN.test(text)) {
      EMOJI_PATTERN.lastIndex = 0;
      return;
    }

    EMOJI_PATTERN.lastIndex = 0;
    element.replaceChildren(renderText(text));
  }

  function enhanceAll(){
    ensureStyles();
    document.querySelectorAll('.ticker-item,#schoolName,#visionText').forEach(enhanceElement);
  }

  function start(){
    enhanceAll();
    setInterval(enhanceAll, 1200);

    const ticker = document.getElementById('tickerTrack');
    if (ticker) {
      const observer = new MutationObserver(enhanceAll);
      observer.observe(ticker, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
