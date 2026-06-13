let periods = [
      ['الحصة الأولى', '16:00', '16:45'],
      ['الحصة الثانية', '16:45', '17:30'],
      ['الحصة الثالثة', '17:30', '18:15'],
      ['الحصة الرابعة', '18:15', '19:00'],
      ['الحصة الخامسة', '19:00', '19:45'],
      ['الحصة السادسة', '19:45', '20:30'],
      ['الحصة السابعة', '20:30', '21:15'],
      ['الحصة الثامنة', '21:15', '22:00']
    ].map(function(item, index) {
      return { name: item[0], start: item[1], end: item[2], index: index + 1 };
    });

    let messages = [
      'نسعى لبناء مستقبل تعليمي متميز',
      'نلتزم بالتفوق والنجاح',
      'الانضباط طريق الإنجاز',
      'العلم والعمل أساس الريادة',
      'مدرستنا بيئة تعلم آمنة ومحفزة'
    ];


    const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
      url: '',
      anonKey: '',
      periodsTable: 'dashboard_periods',
      messagesTable: 'dashboard_messages'
    };

    let supabaseClient = null;

    async function initSupabaseData() {
      if (!window.supabase || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) return;
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      await Promise.all([loadPeriodsFromSupabase(), loadMessagesFromSupabase()]);
      subscribeSupabaseChanges();
    }

    async function loadPeriodsFromSupabase() {
      const result = await supabaseClient
        .from(SUPABASE_CONFIG.periodsTable)
        .select('name,start_time,end_time,sort_order,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (result.error || !result.data || !result.data.length) {
        if (result.error) console.warn('Supabase periods error:', result.error.message);
        return;
      }

      periods = result.data.map(function(row, index) {
        return {
          name: row.name,
          start: normalizeTime(row.start_time),
          end: normalizeTime(row.end_time),
          index: index + 1
        };
      });
    }

    async function loadMessagesFromSupabase() {
      const result = await supabaseClient
        .from(SUPABASE_CONFIG.messagesTable)
        .select('message,sort_order,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (result.error || !result.data || !result.data.length) {
        if (result.error) console.warn('Supabase messages error:', result.error.message);
        return;
      }

      messages = result.data.map(function(row) { return row.message; }).filter(Boolean);
    }

    function subscribeSupabaseChanges() {
      supabaseClient
        .channel('school-dashboard-live-data')
        .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_CONFIG.periodsTable }, async function() {
          await loadPeriodsFromSupabase();
          tick();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_CONFIG.messagesTable }, async function() {
          await loadMessagesFromSupabase();
          buildTicker();
        })
        .subscribe();
    }

    function normalizeTime(value) {
      if (!value) return '00:00';
      const parts = String(value).split(':');
      return pad(Number(parts[0] || 0)) + ':' + pad(Number(parts[1] || 0));
    }
    const el = function(id) { return document.getElementById(id); };
    const pad = function(n) { return String(n).padStart(2, '0'); };
    const toMinutes = function(time) {
      const parts = time.split(':').map(Number);
      return parts[0] * 60 + parts[1];
    };

    function formatArabicTime(time) {
      const parts = time.split(':').map(Number);
      const h = parts[0];
      const m = parts[1];
      const period = h >= 12 ? 'م' : 'ص';
      const h12 = h % 12 || 12;
      return pad(h12) + ':' + pad(m) + ' ' + period;
    }

    function rangeText(period) {
      return 'من ' + formatArabicTime(period.start) + ' إلى ' + formatArabicTime(period.end);
    }

    function currentSchedule(now) {
      const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const current = periods.find(function(p) { return minutes >= toMinutes(p.start) && minutes < toMinutes(p.end); });
      const ended = periods.slice().reverse().find(function(p) { return minutes >= toMinutes(p.end); });
      const next = periods.find(function(p) { return minutes < toMinutes(p.start); });
      return { minutes: minutes, current: current, ended: ended, next: next };
    }

    function setPeriodCard(prefix, period, fallbackTitle, fallbackTime) {
      el(prefix + 'Title').textContent = period ? period.name : fallbackTitle;
      el(prefix + 'Time').textContent = period ? rangeText(period) : (fallbackTime || '-');
    }

    function updateCards(now) {
      const schedule = currentSchedule(now);
      const minutes = schedule.minutes;
      const current = schedule.current;
      const ended = schedule.ended;
      const next = schedule.next;
      setPeriodCard('ended', ended, 'لا يوجد', '-');
      setPeriodCard('current', current, 'لا توجد حصة الآن', '-');
      setPeriodCard('next', next, 'انتهى اليوم الدراسي', '-');

      let progress = 0;
      let countdown = '--:--';
      let label = 'متبقي من الحصة الحالية';

      if (current) {
        const start = toMinutes(current.start);
        const end = toMinutes(current.end);
        progress = Math.max(0, Math.min(100, ((minutes - start) / (end - start)) * 100));
        const remainingSeconds = Math.max(0, Math.round((end - minutes) * 60));
        countdown = pad(Math.floor(remainingSeconds / 60)) + ':' + pad(remainingSeconds % 60);
      } else if (next) {
        const remainingSeconds = Math.max(0, Math.round((toMinutes(next.start) - minutes) * 60));
        countdown = pad(Math.floor(remainingSeconds / 60)) + ':' + pad(remainingSeconds % 60);
        label = 'متبقي على الحصة القادمة';
      } else {
        label = 'انتهى اليوم الدراسي';
        progress = 100;
      }

      el('countdownLabel').textContent = label;
      el('countdownValue').textContent = countdown;
      el('progressPercent').textContent = '%' + Math.round(progress);
      el('progressFill').style.width = progress + '%';
      renderSchedule(current);
    }

    function statusFor(period, current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (current && period.index === current.index) return 'جارية ↻';
      if (minutes >= toMinutes(period.end)) return 'انتهت ✓';
      return 'قادمة';
    }

    function renderSchedule(current) {
      el('scheduleBody').innerHTML = periods.map(function(period) {
        const rowClass = current && current.index === period.index ? 'current' : '';
        return '<tr class="' + rowClass + '">' +
          '<td class="num"><span class="num-badge">' + period.index + '</span></td>' +
          '<td class="lesson">' + period.name + '</td>' +
          '<td class="time">' + rangeText(period) + '</td>' +
          '<td class="state"><span class="status-badge">' + statusFor(period, current) + '</span></td>' +
        '</tr>';
      }).join('');
    }

    function updateClock(now) {
      el('digitalTime').textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      const seconds = now.getSeconds();
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;
      el('secondHand').style.transform = 'translateX(-50%) rotate(' + (seconds * 6) + 'deg)';
      el('minuteHand').style.transform = 'translateX(-50%) rotate(' + (minutes * 6) + 'deg)';
      el('hourHand').style.transform = 'translateX(-50%) rotate(' + (hours * 30) + 'deg)';
    }

    function updateDate(now) {
      el('weekday').textContent = new Intl.DateTimeFormat('ar-OM', { weekday: 'long' }).format(now);
      el('gregorianDate').textContent = new Intl.DateTimeFormat('ar-OM', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
      try {
        el('hijriDate').textContent = new Intl.DateTimeFormat('ar-OM-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
      } catch (error) {
        el('hijriDate').textContent = '';
      }
    }

    function hydrateArabicLabels() {
      const endedPill = document.querySelector('.ended-card .pill');
      const currentPill = document.querySelector('.current-card .pill');
      const nextPill = document.querySelector('.next-card .pill');
      const progressLabel = document.querySelector('.progress-head span:last-child');
      if (endedPill) endedPill.innerHTML = 'الحصة المنتهية <span class="dot"></span>';
      if (currentPill) currentPill.innerHTML = 'الحصة الحالية <span class="dot"></span>';
      if (nextPill) nextPill.innerHTML = 'الحصة القادمة <span class="dot"></span>';
      if (progressLabel) progressLabel.textContent = 'تقدم الحصة';
    }

    function buildTicks() {
      const clock = el('analogClock');
      for (let i = 0; i < 12; i += 1) {
        const tick = document.createElement('span');
        tick.className = 'tick';
        tick.style.transform = 'rotate(' + (i * 30) + 'deg)';
        if (i % 3 !== 0) tick.style.opacity = '0.55';
        clock.prepend(tick);
      }
    }

    function buildTicker() {
      const content = messages.concat(messages).map(function(message) {
        return '<span class="ticker-item">' + message + '</span>';
      }).join('');
      el('tickerTrack').innerHTML = content;
    }

    function tick() {
      const now = new Date();
      updateClock(now);
      updateDate(now);
      updateCards(now);
    }

    hydrateArabicLabels();
    buildTicks();
    initSupabaseData()
      .catch(function(error) { console.warn('Supabase init error:', error); })
      .finally(function() {
        buildTicker();
        tick();
        setInterval(tick, 1000);
      });
