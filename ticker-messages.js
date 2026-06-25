(function(){
  const DEFAULT_MESSAGES = [
    'مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري',
    'العلم نور',
    'الانضباط طريق النجاح',
    'نسعى لبناء مستقبل تعليمي متميز'
  ];

  const schoolSlug = new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
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

  function createGroup(messages){
    const group = document.createElement('div');
    group.className = 'ticker-group';

    messages.forEach((message) => {
      const item = document.createElement('span');
      item.className = 'ticker-item';
      item.textContent = message;
      group.appendChild(item);
    });

    return group;
  }

  function renderTicker(messages){
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const cleanMessages = messages
      .map((message) => String(message || '').trim())
      .filter(Boolean);

    const finalMessages = cleanMessages.length ? cleanMessages : DEFAULT_MESSAGES;

    track.replaceChildren(
      createGroup(finalMessages),
      createGroup(finalMessages)
    );
  }

  async function loadTickerMessages(){
    const db = getClient();

    if (!db) {
      renderTicker(DEFAULT_MESSAGES);
      return;
    }

    try {
      const { data, error } = await db
        .from('school_messages')
        .select('message_text,is_active,sort_order')
        .eq('school_slug', schoolSlug)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data || !data.length) {
        renderTicker(DEFAULT_MESSAGES);
        return;
      }

      renderTicker(data.map((row) => row.message_text));
    } catch (error) {
      renderTicker(DEFAULT_MESSAGES);
    }
  }

  function start(){
    loadTickerMessages();
    setTimeout(loadTickerMessages, 900);
    setInterval(loadTickerMessages, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
