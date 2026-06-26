(function(){
  if (window.__schoolTimerTickerMessagesLoaded) return;
  window.__schoolTimerTickerMessagesLoaded = true;

  const DEFAULT_MESSAGES = [
    'مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري',
    'العلم نور',
    'الانضباط طريق النجاح',
    'نسعى لبناء مستقبل تعليمي متميز'
  ];

  const CACHE_TTL = 10 * 60 * 1000;
  const REFRESH_INTERVAL = 10 * 60 * 1000;
  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  const cacheKey = 'school_timer_messages_' + schoolSlug;
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

      const messages = data
        .map((row) => row.message_text)
        .filter((message) => !isCardConfigMessage(message));

      writeCache(messages);
      renderTicker(messages);
    } catch (error) {
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
