const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;
const isClassroomMode = location.pathname.includes("classroom");

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
      showError("لم يتم العثور على المدرسة. تأكد من school_slug وحالة التفعيل في جدول schools.");
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
      showError("لم يتم تحديد توقيت نشط لهذه المدرسة في جدول school_schedules.");
      return;
    }

    const activeScheduleId = activeSchedules[0].schedule_id;

    const { data: schedule, error: scheduleError } = await supabaseClient
      .from("schedules")
      .select("*")
      .eq("id", activeScheduleId)
      .single();

    if (scheduleError || !schedule) {
      showError("تعذر تحميل اسم التوقيت من جدول schedules.");
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
      showError("تعذر تحميل جدول الحصص من schedule_items.");
      return;
    }

    scheduleItems = (items || []).filter(Boolean);
    setText("scheduleCount", `${scheduleItems.length} فترة`);

    await loadMessages();

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
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (!error && data && data.length > 0) {
    messages = data;
  }
}

function rotateMessage() {
  if (!messages.length) return;

  const message = messages[messageIndex];
  setText("educationMessage", message.message_text);

  messageIndex++;
  if (messageIndex >= messages.length) messageIndex = 0;
}

function applySchoolTheme(school) {
  const primary = school.primary_color || "#0f766e";
  const secondary = school.secondary_color || "#b7791f";
  const background = school.background_color || "#ecfdf5";

  document.documentElement.style.setProperty("--primary", primary);
  document.documentElement.style.setProperty("--secondary", secondary);
  document.documentElement.style.setProperty("--background", background);

  document.body.style.background = background;

  if (school.pattern_url) {
    document.body.style.backgroundImage = `url('${school.pattern_url}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
  }
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
    hour12: true
  });
}

function fmtDate(date) {
  return date.toLocaleDateString("ar-OM", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function fmtRange(item) {
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

function findCurrentAndNext(now) {
  let current = null;
  let next = null;

  for (const item of scheduleItems) {
    const start = timeToDate(item.start_time);
    const end = timeToDate(item.end_time);

    if (now >= start && now <= end) current = item;
    if (now < start && !next) next = item;
  }

  return { current, next };
}

function updateTimer() {
  const now = new Date();

  setText("currentTime", fmtClock(now));
  setText("dayName", now.toLocaleDateString("ar-OM", { weekday: "long" }));
  setText("dateText", fmtDate(now));

  const { current, next } = findCurrentAndNext(now);

  if (current) {
    const start = timeToDate(current.start_time);
    const end = timeToDate(current.end_time);

    const remainingMs = end - now;
    const totalMs = end - start;
    const elapsedMs = now - start;
    const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

    setText("currentPeriod", current.period_name);
    setText("remainingTime", formatDuration(remainingMs));
    setText("periodRange", fmtRange(current));

    setProgress(progress);
    updateAlert(current, remainingMs);
    announceStart(current);
  } else {
    setText("currentPeriod", "لا توجد حصة الآن");
    setText("remainingTime", "--:--");
    setText("periodRange", "");
    setProgress(0);
    hideAlert();
  }

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

  renderSchedule(now);
}

function setProgress(percent) {
  const fill = document.getElementById("progressFill");
  if (fill) fill.style.width = `${percent}%`;
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

function renderSchedule(now) {
  const list = document.getElementById("scheduleList");
  if (!list) return;

  list.innerHTML = "";

  scheduleItems.forEach(item => {
    const state = getItemState(item, now);
    const isBreak = item.is_break === true || String(item.period_name).includes("فسحة");

    let icon = "🔵";
    let status = "قادمة";

    if (state === "finished") {
      icon = "✔";
      status = "انتهت";
    }

    if (state === "active") {
      icon = isBreak ? "☕" : "🟢";
      status = "جارية الآن";
    }

    if (isBreak && state !== "active") {
      icon = "☕";
    }

    const classes = ["item", state];
    if (isBreak) classes.push("break");

    const div = document.createElement("div");
    div.className = classes.join(" ");

    div.innerHTML = `
      <span class="icon">${icon}</span>
      <span class="name">${item.period_name}</span>
      <span class="time">${fmtRange(item)}</span>
      <span class="status">${status}</span>
    `;

    list.appendChild(div);
  });
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

loadSchool();
