const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;

let scheduleItems = [];
let currentSchool = null;
let currentSchedule = null;
let messages = [];
let messageIndex = 0;

let lastAlertKey = "";
let lastStartedKey = "";
let timerStarted = false;
let messageTimerStarted = false;

async function loadSchool() {
  try {
    setClassroomLink();

    const { data: school, error: schoolError } = await supabaseClient
      .from("schools")
      .select("*")
      .eq("school_slug", schoolSlug)
      .eq("is_active", true)
      .single();

    if (schoolError || !school) {
      showError("لم يتم العثور على المدرسة.");
      return;
    }

    currentSchool = school;

    document.title = school.school_name || "مؤقت الحصص المدرسية";
    setText("schoolName", school.school_name || "مدرسة بدون اسم");

    applySchoolTheme(school);

    const schoolLogo = school.logo_url || "icons/default-icon.svg";
    const appIcon = school.app_icon_url || school.logo_url || "icons/default-icon.svg";

    const logoEl = document.getElementById("schoolLogo");
    if (logoEl) {
      logoEl.src = schoolLogo;
      logoEl.onerror = () => {
        logoEl.src = "icons/default-icon.svg";
      };
    }

    setPageIcons(appIcon);

    const { data: activeSchedules, error: activeScheduleError } = await supabaseClient
      .from("school_schedules")
      .select("*")
      .eq("school_id", school.id)
      .eq("is_active", true);

    if (activeScheduleError || !activeSchedules || activeSchedules.length === 0) {
      showError("لم يتم تحديد توقيت نشط لهذه المدرسة.");
      return;
    }

    const activeScheduleId = activeSchedules[0].schedule_id;

    const { data: schedule, error: scheduleError } = await supabaseClient
      .from("schedules")
      .select("*")
      .eq("id", activeScheduleId)
      .single();

    if (scheduleError || !schedule) {
      showError("تعذر تحميل اسم التوقيت.");
      return;
    }

    currentSchedule = schedule;
    setText("scheduleName", schedule.schedule_name || "التوقيت المدرسي");

    const { data: items, error: itemsError } = await supabaseClient
      .from("schedule_items")
      .select("*")
      .eq("schedule_id", activeScheduleId)
      .order("period_order", { ascending: true });

    if (itemsError) {
      showError("تعذر تحميل جدول الحصص.");
      return;
    }

    scheduleItems = (items || []).filter(Boolean);
    setText("scheduleCount", `${scheduleItems.length} فترة`);

    await loadMessages();

    buildClockTicks();
    buildTicker();

    updateTimer();

    if (!timerStarted) {
      setInterval(updateTimer, 1000);
      timerStarted = true;
    }

    if (!messageTimerStarted) {
      rotateMessage();
      setInterval(rotateMessage, 15000);
      messageTimerStarted = true;
    }

  } catch (err) {
    showError("حدث خطأ أثناء تحميل البيانات.");
    console.error(err);
  }
}

async function loadMessages() {
  let query = supabaseClient
    .from("messages")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (currentSchool?.id) {
    query = query.eq("school_id", currentSchool.id);
  }

  const { data, error } = await query;

  if (!error && data && data.length > 0) {
    messages = data;
  } else {
    messages = [
      { message_text: "الوقت قيمة لا تعوض" },
      { message_text: "الانضباط طريق التميز" },
      { message_text: "حصتك فرصة جديدة للتعلم" }
    ];
  }
}

function rotateMessage() {
  if (!messages.length) return;

  const message = messages[messageIndex];
  setText("educationMessage", message.message_text);

  messageIndex++;
  if (messageIndex >= messages.length) messageIndex = 0;

  buildTicker();
}

function buildTicker() {
  const ticker = document.getElementById("tickerTrack");
  if (!ticker) return;

  const source = messages.length
    ? messages.map(m => m.message_text)
    : ["الوقت قيمة لا تعوض", "الانضباط طريق التميز"];

  ticker.innerHTML = source.concat(source).map(message => {
    return `<span class="ticker-item">${message}</span>`;
  }).join("");
}

function applySchoolTheme(school) {
  const primary = school.primary_color || "#064b35";
  const secondary = school.secondary_color || "#d6a93c";
  const background = school.background_color || "#f4ead8";

  document.documentElement.style.setProperty("--primary", primary);
  document.documentElement.style.setProperty("--secondary", secondary);
  document.documentElement.style.setProperty("--bg", background);

  document.body.style.background = background;
}

function setClassroomLink() {
  const link = document.getElementById("classroomLink");
  if (link) link.href = `classroom.html?school=${encodeURIComponent(schoolSlug)}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setPageIcons(iconUrl) {
  const icon = document.querySelector("link[rel='icon']");
  const apple = document.querySelector("link[rel='apple-touch-icon']");

  if (icon) icon.href = iconUrl;
  if (apple) apple.href = iconUrl;
}

function showError(message) {
  document.body.innerHTML = `<div class="error-box">${message}</div>`;
}

function timeToDate(time) {
  const [h, m, s] = String(time || "00:00:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, s || 0, 0);
  return d;
}

function fmtClock(date) {
  return date.toLocaleTimeString("ar-OM", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function fmtDate(date) {
  return date.toLocaleDateString("ar-OM", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function fmtHijri(date) {
  try {
    return new Intl.DateTimeFormat("ar-OM-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("ar-OM-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date);
    } catch {
      return "";
    }
  }
}

function fmtRange(item) {
  if (!item) return "--";
  return `${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getItemState(item, now) {
  const start = timeToDate(item.start_time);
  const end = timeToDate(item.end_time);

  if (now > end) return "finished";
  if (now >= start && now <= end) return "active";
  return "upcoming";
}

function isBreakItem(item) {
  return item?.is_break === true || String(item?.period_name || "").includes("فسحة");
}

function findPeriods(now) {
  let previous = null;
  let current = null;
  let next = null;
  let nextBreak = null;

  for (const item of scheduleItems) {
    const start = timeToDate(item.start_time);
    const end = timeToDate(item.end_time);

    if (now > end) previous = item;
    if (now >= start && now <= end) current = item;
    if (now < start && !next) next = item;
    if (now < start && isBreakItem(item) && !nextBreak) nextBreak = item;
  }

  return { previous, current, next, nextBreak };
}

function updateTimer() {
  const now = new Date();

  updateClock(now);
  updateDate(now);

  const { previous, current, next, nextBreak } = findPeriods(now);

  updatePeriodCards(previous, current, next, nextBreak);
  updateMainCountdown(now, current, next);

  if (next) {
    const startsIn = timeToDate(next.start_time) - now;
    setText("nextPeriod", next.period_name);
    setText("nextRange", fmtRange(next));
    setText("nextStartsIn", `تبدأ بعد ${formatDuration(startsIn)}`);
  } else {
    setText("nextPeriod", "انتهى اليوم الدراسي");
    setText("nextRange", "");
    setText("nextStartsIn", "");
  }

  updateStats(now);
  renderSchedule(now);
}

function updateClock(now) {
  setText("digitalTime", fmtClock(now));

  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secondHand = document.getElementById("secondHand");
  const minuteHand = document.getElementById("minuteHand");
  const hourHand = document.getElementById("hourHand");

  if (secondHand) {
    secondHand.style.transform = `translateX(-50%) rotate(${seconds * 6}deg)`;
  }

  if (minuteHand) {
    minuteHand.style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`;
  }

  if (hourHand) {
    hourHand.style.transform = `translateX(-50%) rotate(${hours * 30}deg)`;
  }
}

function updateDate(now) {
  const weekday = now.toLocaleDateString("ar-OM", { weekday: "long" });
  const gregorian = fmtDate(now);
  const hijri = fmtHijri(now);

  setText("weekday", weekday);
  setText("gregorianDate", gregorian);
  setText("hijriDate", hijri);
}

function updatePeriodCards(previous, current, next, nextBreak) {
  setText("endedTitle", previous?.period_name || "لا يوجد");
  setText("endedTime", previous ? fmtRange(previous) : "-");

  setText("currentTitle", current?.period_name || "لا توجد حصة الآن");
  setText("currentTimeRange", current ? fmtRange(current) : "-");

  setText("nextTitle", next?.period_name || "انتهى اليوم الدراسي");
  setText("nextTime", next ? fmtRange(next) : "-");

  setText("breakTitle", nextBreak?.period_name || "--");
  setText("breakTime", nextBreak ? fmtRange(nextBreak) : "--");
}

function updateMainCountdown(now, current, next) {
  let progress = 0;
  let countdown = "--:--";
  let label = "متبقي من الحصة الحالية";

  if (current) {
    const start = timeToDate(current.start_time);
    const end = timeToDate(current.end_time);

    const remainingMs = end - now;
    const totalMs = end - start;
    const elapsedMs = now - start;

    progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    countdown = formatDuration(remainingMs);

    updateAlert(current, remainingMs);
    announceStart(current);
  } else if (next) {
    const remainingMs = timeToDate(next.start_time) - now;
    label = "متبقي على الحصة القادمة";
    countdown = formatDuration(remainingMs);
    progress = 0;
    hideAlert();
  } else {
    label = "انتهى اليوم الدراسي";
    countdown = "--:--";
    progress = 100;
    hideAlert();
  }

  setText("countdownLabel", label);
  setText("countdownValue", countdown);
  setText("progressPercent", `%${Math.round(progress)}`);

  setProgress(progress);
}

function updateStats(now) {
  let finished = 0;
  let active = 0;
  let upcoming = 0;

  scheduleItems.forEach(item => {
    const state = getItemState(item, now);

    if (state === "finished") finished++;
    if (state === "active") active++;
    if (state === "upcoming") upcoming++;
  });

  setText("finishedCount", finished);
  setText("activeCount", active);
  setText("upcomingCount", upcoming);
}

function setProgress(percent) {
  const fill = document.getElementById("progressFill");
  if (fill) fill.style.width = `${percent}%`;
}

function renderSchedule(now) {
  const body = document.getElementById("scheduleBody");
  if (!body) return;

  body.innerHTML = "";

  scheduleItems.forEach((item, index) => {
    const state = getItemState(item, now);
    const isBreak = isBreakItem(item);

    let status = "قادمة";

    if (state === "finished") {
      status = "انتهت ✓";
    }

    if (state === "active") {
      status = isBreak ? "فسحة الآن ☕" : "جارية ↻";
    }

    const tr = document.createElement("tr");

    if (state === "active") {
      tr.classList.add("current");
    }

    tr.innerHTML = `
      <td class="num"><span class="num-badge">${isBreak ? "-" : index + 1}</span></td>
      <td class="lesson">${item.period_name}</td>
      <td class="time">${fmtRange(item)}</td>
      <td class="state"><span class="status-badge">${status}</span></td>
    `;

    body.appendChild(tr);
  });
}

function updateAlert(current, remainingMs) {
  const alertBar = document.getElementById("alertBar");
  if (!alertBar) return;

  const remainingMinutes = Math.ceil(remainingMs / 60000);
  const alertMs = ALERT_BEFORE_MINUTES * 60000;

  if (remainingMs <= alertMs && remainingMs > 0) {
    alertBar.classList.remove("hidden", "danger");
    alertBar.textContent = `🔔 بقي ${remainingMinutes} دقائق على نهاية ${current.period_name}`;

    const key = `${current.id || current.period_order}-${remainingMinutes}`;

    if (ENABLE_SOUND_ALERT && key !== lastAlertKey && remainingMinutes === ALERT_BEFORE_MINUTES) {
      playBeep();
      lastAlertKey = key;
    }
  } else {
    hideAlert();
  }
}

function announceStart(current) {
  const key = `${current.id || current.period_order}-started`;
  const start = timeToDate(current.start_time);
  const now = new Date();
  const diff = Math.abs(now - start);

  if (ENABLE_SOUND_ALERT && diff < 1500 && key !== lastStartedKey) {
    showTemporaryAlert(`🔔 بدأت ${current.period_name}`, true);
    playBeep();
    lastStartedKey = key;
  }
}

function showTemporaryAlert(text, danger = false) {
  const alertBar = document.getElementById("alertBar");
  if (!alertBar) return;

  alertBar.classList.remove("hidden");
  alertBar.classList.toggle("danger", danger);
  alertBar.textContent = text;

  setTimeout(() => hideAlert(), 6000);
}

function hideAlert() {
  const alertBar = document.getElementById("alertBar");
  if (alertBar) alertBar.classList.add("hidden");
}

function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 450);
  } catch (e) {
    console.warn("تعذر تشغيل الصوت", e);
  }
}

function buildClockTicks() {
  const clock = document.getElementById("analogClock");
  if (!clock) return;

  const existingTicks = clock.querySelectorAll(".tick");
  if (existingTicks.length > 0) return;

  for (let i = 0; i < 12; i++) {
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.style.transform = `rotate(${i * 30}deg)`;

    if (i % 3 !== 0) {
      tick.style.opacity = "0.55";
    }

    clock.prepend(tick);
  }
}

loadSchool();
