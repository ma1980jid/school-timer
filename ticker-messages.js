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
  const CACHE_TTL = 10 * 60 * 1000;
  const REFRESH_INTERVAL = 10 * 60 * 1000;
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_messages_' + schoolSlug;
  const cardsCacheKey = 'school_timer_middle_cards_' + schoolSlug;
  let client = null;
  let lastSignature = '';
  let refreshTimer = null;
  let isLoading = false;
  let resizeTimer = null;

  function isCardConfigMessage(message){
    return String(message || '').startsWith('__CARD_');
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

  function createGroup(messages){
    const group = document.createElement('div');
    group.className = 'ticker-group';

    const fragment = document.createDocumentFragment();

    messages.forEach((message) => {
      const item = document.createElement('span');
      item.className = 'ticker-item';
      item.textContent = message;
      fragment.appendChild(item);
    });

    group.appendChild(fragment);
    return group;
  }

  function clean(messages){
    return (Array.isArray(messages) ? messages : [])
      .map((message) => String(message || '').trim())
      .filter(Boolean)
      .filter((message) => !isCardConfigMessage(message));
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
      if (rightEl && rightEl.textContent !== rightText) rightEl.textContent = rightText;
    }

    if (leftText) {
      try { settings.visionMessages = [leftText]; } catch (error) {}
      const leftEl = document.getElementById('visionText');
      if (leftEl && leftEl.textContent !== leftText) leftEl.textContent = leftText;
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
      renderTicker(DEFAULT_MESSAGES);
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
        renderTicker(DEFAULT_MESSAGES);
        return;
      }

      const cards = parseCards(data);
      if (cards.right || cards.left) {
        writeCardsCache(cards);
        applyCards(cards);
      }

      const messages = data
        .map((row) => row.message_text)
        .filter((message) => !isCardConfigMessage(message));

      writeCache(messages);
      renderTicker(messages);
    } catch (error) {
      applyCards(readCardsCache());
      renderTicker(readCache() || DEFAULT_MESSAGES);
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
    renderTicker(readCache() || DEFAULT_MESSAGES);
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
