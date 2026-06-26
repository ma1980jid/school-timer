(function(){
  if (window.__schoolTimerMiddleCardsLoaded) return;
  window.__schoolTimerMiddleCardsLoaded = true;

  const RIGHT_PREFIX = '__CARD_RIGHT__:';
  const LEFT_PREFIX = '__CARD_LEFT__:';
  const CACHE_TTL = 10 * 60 * 1000;
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_middle_cards_' + schoolSlug;
  let client = null;

  function getClient(){
    if (client) return client;
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;
    client = window.supabase.createClient(
      window.SCHOOL_TIMER_SUPABASE_URL,
      window.SCHOOL_TIMER_SUPABASE_ANON_KEY
    );
    return client;
  }

  function clean(text){
    return String(text || '').replace(/^__CARD_(RIGHT|LEFT)__:/, '').trim();
  }

  function setMiddleCards(cards){
    const rightText = clean(cards && cards.right);
    const leftText = clean(cards && cards.left);

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

  function readCache(){
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !cached.cards) return null;
      if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL) return null;
      return cached.cards;
    } catch (error) {
      return null;
    }
  }

  function writeCache(cards){
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), cards }));
    } catch (error) {}
  }

  function parseRows(rows){
    const cards = {};
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const text = String(row && row.message_text || '');
      if (text.startsWith(RIGHT_PREFIX)) cards.right = text.slice(RIGHT_PREFIX.length).trim();
      if (text.startsWith(LEFT_PREFIX)) cards.left = text.slice(LEFT_PREFIX.length).trim();
    });
    return cards;
  }

  async function loadCards(){
    const db = getClient();
    if (!db) return;

    try {
      const { data, error } = await db
        .from('school_messages')
        .select('message_text,sort_order')
        .eq('school_slug', schoolSlug)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) return;
      const cards = parseRows(data);
      if (cards.right || cards.left) {
        writeCache(cards);
        setMiddleCards(cards);
      }
    } catch (error) {}
  }

  function start(){
    const cached = readCache();
    if (cached) setMiddleCards(cached);
    setTimeout(loadCards, 1500);
    setInterval(loadCards, 10 * 60 * 1000);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadCards();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
