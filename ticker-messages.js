(function(){
  if (window.__schoolTimerTickerMessagesLoaded) return;
  window.__schoolTimerTickerMessagesLoaded = true;

  const DEFAULT_MESSAGES = [
    'مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري',
    'العلم نور',
    'الانضباط طريق النجاح',
    'نسعى لبناء مستقبل تعليمي متميز'
  ];

  const RIGHT_PREFIX = '__CARD_RIGHT__:';
  const LEFT_PREFIX = '__CARD_LEFT__:';
  const SCHEDULED_PREFIX = '__SCHEDULED__:';
  const EMOJI_PATTERN = /(🇴🇲|📌|📍|❤️|❤|🗡️|🗡|⚔️|⚔)/gu;
  const CACHE_TTL = 10 * 60 * 1000;
  const REFRESH_INTERVAL = 10 * 60 * 1000;
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_messages_' + schoolSlug;
  const cardsCacheKey = 'school_timer_middle_cards_' + schoolSlug;
  const scheduledCacheKey = 'school_timer_scheduled_' + schoolSlug;
  let client = null;
  let lastSignature = '';
  let refreshTimer = null;
  let isLoading = false;
  let resizeTimer = null;

  function isCardConfigMessage(message){
    return String(message || '').startsWith('__CARD_');
  }

  function isScheduledConfigMessage(message){
    return String(message || '').startsWith(SCHEDULED_PREFIX);
  }

  function isSystemMessage(message){
    return isCardConfigMessage(message) || isScheduledConfigMessage(message);
  }

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(
      window.SCHOOL_TIMER_SUPABASE_URL,
      window.SCHOOL_TIMER_SUPABASE_ANON_KEY
    );
    return client;
  }

  function ensureSafeEmojiStyles(){
    if (document.getElementById('safeEmojiTickerStyles')) return;

    const style = document.createElement('style');
    style.id = 'safeEmojiTickerStyles';
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

  function safeIconFor(token){
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

  function renderMessageContent(message){
    ensureSafeEmojiStyles();

    const fragment = document.createDocumentFragment();
    const parts = String(message || '').split(EMOJI_PATTERN).filter((part) => part !== '');

    parts.forEach((part) => {
      EMOJI_PATTERN.lastIndex = 0;
      if (part.match(EMOJI_PATTERN)) {
        fragment.appendChild(safeIconFor(part));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    return fragment;
  }

  function createGroup(messages){
    const group = document.createElement('div');
    group.className = 'ticker-group';

    const fragment = document.createDocumentFragment();

    messages.forEach((message) => {
      const item = document.createElement('span');
      item.className = 'ticker-item';
      item.replaceChildren(renderMessageContent(message));
      fragment.appendChild(item);
    });

    group.appendChild(fragment);
    return group;
  }

  function clean(messages){
    return (Array.isArray(messages) ? messages : [])
      .map((message) => String(message || '').trim())
      .filter(Boolean)
      .filter((message) => !isSystemMessage(message));
  }

  function getTodayKey(){
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function normalizeAnnualDate(dateText, year){
    const text = String(dateText || '').trim();
    const parts = text.split('-');
    if (parts.length !== 3) return text;
    return `${year}-${parts[1]}-${parts[2]}`;
  }

  function isAnnouncementActive(item, today = getTodayKey()){
    if (!item || item.active === false) return false;

    const currentYear = today.slice(0, 4);
    let start = String(item.start || '').trim();
    let end = String(item.end || item.start || '').trim();

    if (!start) return false;

    if (item.annual) {
      start = normalizeAnnualDate(start, currentYear);
      end = normalizeAnnualDate(end || start, currentYear);
    }

    return today >= start && today <= end;
  }

  function parseScheduledAnnouncements(rows){
    return (Array.isArray(rows) ? rows : [])
      .map((row) => String(row && row.message_text || ''))
      .filter((text) => text.startsWith(SCHEDULED_PREFIX))
      .map((text) => {
        try {
          return JSON.parse(text.slice(SCHEDULED_PREFIX.length));
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
      .filter((item) => isAnnouncementActive(item));
  }

  function legacyAnnouncementText(item){
    const title = String(item && item.title || '').trim();
    const text = String(item && item.text || '').trim();
    if (title && text) return `${title}: ${text}`;
    return text || title;
  }

  function getScheduledSlotTexts(item){
    const tickerText = String(item && item.tickerText || '').trim();
    const rightText = String(item && item.rightText || '').trim();
    const leftText = String(item && item.leftText || '').trim();

    if (tickerText || rightText || leftText) {
      return { tickerText, rightText, leftText };
    }

    const legacyText = legacyAnnouncementText(item);
    const target = String(item && item.target || 'ticker');
    return {
      tickerText: target === 'ticker' || target === 'all' ? legacyText : '',
      rightText: target === 'right' || target === 'all' ? legacyText : '',
      leftText: target === 'left' || target === 'all' ? legacyText : ''
    };
  }

  function applyScheduledAnnouncements(items){
    const active = Array.isArray(items) ? items : [];
    if (!active.length) return [];

    const tickerMessages = [];
    const cardOverrides = {};

    active.forEach((item) => {
      const { tickerText, rightText, leftText } = getScheduledSlotTexts(item);

      if (tickerText) {
        tickerMessages.push(`📌 ${tickerText}`);
      }

      if (rightText) {
        cardOverrides.right = rightText;
      }

      if (leftText) {
        cardOverrides.left = leftText;
      }
    });

    if (cardOverrides.right || cardOverrides.left) {
      applyCards(cardOverrides);
    }

    return tickerMessages;
  }

  function writeScheduledCache(items){
    try {
      localStorage.setItem(scheduledCacheKey, JSON.stringify({ savedAt: Date.now(), items: Array.isArray(items) ? items : [] }));
    } catch (error) {}
  }

  function readScheduledCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(scheduledCacheKey) || 'null');
      if (!cached || !Array.isArray(cached.items)) return [];
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return [];
      return cached.items.filter((item) => isAnnouncementActive(item));
    } catch (error) {
      return [];
    }
  }

  function parseCards(rows){
    const cards = {};
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const text = String(row && row.message_text || '');
      if (text.startsWith(RIGHT_PREFIX)) cards.right = text.slice(RIGHT_PREFIX.length).trim();
      if (text.startsWith(LEFT_PREFIX)) cards.left = text.slice(LEFT_PREFIX.length).trim();
    });
    return cards;
  }

  function applyCards(cards){
    if (!cards) return;

    const rightText = String(cards.right || '').trim();
    const leftText = String(cards.left || '').trim();

    if (rightText) {
      try { settings.schoolName = rightText; } catch (error) {}
      const rightEl = document.getElementById('schoolName');
      if (rightEl && rightEl.textContent !== rightText) rightEl.replaceChildren(renderMessageContent(rightText));
    }

    if (leftText) {
      try {
        settings.visionMessages = [leftText];
        if (typeof visionIndex !== 'undefined') visionIndex = 0;
      } catch (error) {}
      const leftEl = document.getElementById('visionText');
      if (leftEl && leftEl.textContent !== leftText) leftEl.replaceChildren(renderMessageContent(leftText));
    }
  }

  function readCardsCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cardsCacheKey) || 'null');
      if (!cached || !cached.cards) return null;
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return null;
      return cached.cards;
    } catch (error) {
      return null;
    }
  }

  function writeCardsCache(cards){
    try {
      localStorage.setItem(cardsCacheKey, JSON.stringify({ savedAt: Date.now(), cards }));
    } catch (error) {}
  }

  function setupTickerMotion(){
    const track = document.getElementById('tickerTrack');
    const firstGroup = track && track.querySelector('.ticker-group');
    if (!track || !firstGroup) return;

    const distance = Math.ceil(firstGroup.getBoundingClientRect().width);
    if (!distance) return;

    const isMobile = matchMedia('(max-width: 768px)').matches;
    const speed = isMobile ? 46 : 58;
    const minDuration = isMobile ? 24 : 30;
    const duration = Math.max(minDuration, Math.ceil(distance / speed));

    track.style.setProperty('--ticker-distance', `-${distance}px`);
    track.style.setProperty('--ticker-duration', `${duration}s`);

    track.style.animation = 'none';
    track.offsetHeight;
    track.style.animation = '';
  }

  function renderTicker(messages){
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const cleaned = clean(messages);
    const finalMessages = cleaned.length ? cleaned : DEFAULT_MESSAGES;
    const signature = finalMessages.join('||');
    if (signature === lastSignature && track.children.length) {
      requestAnimationFrame(setupTickerMotion);
      return;
    }

    lastSignature = signature;
    track.replaceChildren(
      createGroup(finalMessages),
      createGroup(finalMessages),
      createGroup(finalMessages)
    );

    requestAnimationFrame(setupTickerMotion);
  }

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !Array.isArray(cached.messages)) return null;
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return null;
      return clean(cached.messages);
    } catch (error) {
      return null;
    }
  }

  function writeCache(messages){
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        savedAt: Date.now(),
        messages: clean(messages)
      }));
    } catch (error) {}
  }

  async function loadTickerMessages(){
    if (isLoading) return;
    if (document.hidden) return;

    const db = getClient();

    if (!db) {
      const scheduledMessages = applyScheduledAnnouncements(readScheduledCache());
      renderTicker([...(readCache() || DEFAULT_MESSAGES), ...scheduledMessages]);
      return;
    }

    isLoading = true;

    try {
      const { data, error } = await db
        .from('school_messages')
        .select('message_text,sort_order')
        .eq('school_slug', schoolSlug)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data || !data.length) {
        const scheduledMessages = applyScheduledAnnouncements(readScheduledCache());
        renderTicker([...(readCache() || DEFAULT_MESSAGES), ...scheduledMessages]);
        return;
      }

      const cards = parseCards(data);
      if (cards.right || cards.left) {
        writeCardsCache(cards);
        applyCards(cards);
      }

      const scheduledItems = parseScheduledAnnouncements(data);
      writeScheduledCache(scheduledItems);
      const scheduledMessages = applyScheduledAnnouncements(scheduledItems);

      const messages = data
        .map((row) => row.message_text)
        .filter((message) => !isSystemMessage(message));

      const finalMessages = [...messages, ...scheduledMessages];
      writeCache(finalMessages);
      renderTicker(finalMessages);
    } catch (error) {
      applyCards(readCardsCache());
      const scheduledMessages = applyScheduledAnnouncements(readScheduledCache());
      renderTicker([...(readCache() || DEFAULT_MESSAGES), ...scheduledMessages]);
    } finally {
      isLoading = false;
    }
  }

  function scheduleRefresh(){
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadTickerMessages, REFRESH_INTERVAL);
  }

  function start(){
    applyCards(readCardsCache());
    const scheduledMessages = applyScheduledAnnouncements(readScheduledCache());
    renderTicker([...(readCache() || DEFAULT_MESSAGES), ...scheduledMessages]);
    setTimeout(loadTickerMessages, 1200);
    scheduleRefresh();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadTickerMessages();
      requestAnimationFrame(setupTickerMotion);
    }
  });

  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupTickerMotion, 180);
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
