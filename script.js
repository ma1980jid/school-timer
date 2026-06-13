const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;

let periods = [];
let messages = [];
let currentSchool = null;

let lastAlertKey = "";
let lastStartedKey = "";
let timerStarted = false;

const el = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");

loadDashboard();

async function loadDashboard() {
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
    setText("schoolName", school.school_name || "مؤقت الحصص المدرسية");

    const schoolLogo = school.logo_url || "icons/default-icon.svg";
    const appIcon = school.app_icon_url || school.logo_url || "icons/default-icon.svg";

    const logo = el("schoolLogo");
    if (logo) {
      logo.src = schoolLogo;
      logo.onerror = () => logo.src = "icons/default-icon.svg";
    }

    setPageIcons(appIcon);
    applySchoolTheme(school);

    const activeScheduleId = await getActiveScheduleId(school.id);
    if (!activeScheduleId) {
      showError("لم يتم تحديد توقيت نشط لهذه المدرسة.");
      return;
    }

    await loadSchedule(activeScheduleId);
    await loadMessages();

    buildTicks();
    buildTicker();

    tick();

    if (!timerStarted) {
      setInterval(tick, 1000);
      timerStarted = true;
    }

  } catch (error) {
    console.error(error);
    showError("حدث خطأ أثناء تحميل البيانات.");
  }
}

async function getActiveScheduleId(schoolId) {
  const { data, error } = await supabaseClient
    .from("school_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].schedule_id;
}

async function loadSchedule(scheduleId) {
  const { data: schedule } = await supabaseClient
    .from("schedules")
    .select("*")
    .eq("id", scheduleId)
    .single();

  setText("scheduleName", schedule?.schedule_name || "التوقيت المدرسي");

  const { data, error } = await supabaseClient
    .from("schedule_items")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("period_order", { ascending: true });

  if (error || !data) {
    showError("تعذر تحميل جدول الحصص.");
    return;
  }

  periods = data.map((item, index) => ({
    id: item.id,
    name: item.period_name,
    start: normalizeTime(item.start_time),
    end: normalizeTime(item.end_time),
    isBreak: item.is_break === true || String(item.period_name).includes("فسحة"),
    index: index + 1
  }));
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("school_id", currentSchool.id)
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (!error && data && data.length > 0) {
    messages = data.map(row => row.message_text).filter(Boolean);
  } else {
    messages = [
      "الوقت قيمة لا تعوض",
      "الانضباط طريق التميز",
      "حصتك فرصة جديدة للتعلم"
    ];
  }
}

function normalizeTime(value) {
  if (!value) return "00:00";
  const parts = String(value).split(":");
  return `${pad(Number(parts[0] || 0))}:${pad(Number(parts[1] || 0))}`;
}

function toMinutes(time) {
  const parts = time.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function formatArabicTime(time) {
  const parts = time.split(":").map(Number);
  const h = parts[0];
  const m = parts[1];
  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${pad(h12)}:${pad(m)} ${period}`;
}

function rangeText(period) {
  if (!period) return "-";
  return `من ${formatArabicTime(period.start)} إلى ${formatArabicTime(period.end)}`;
}

function currentSchedule(now) {
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const current = periods.find(p =>
    minutes >= toMinutes(p.start) && minutes < toMinutes(p.end)
  );

  const ended = periods
    .slice()
    .reverse()
    .find(p => minutes >= toMinutes(p.end));

  const next = periods.find(p => minutes < toMinutes(p.start));

  return { minutes, current, ended, next };
}

function setPeriodCard(prefix, period, fallbackTitle, fallbackTime) {
  setText(prefix + "Title", period ? period.name : fallbackTitle);
  setText(prefix + "Time", period ? rangeText(period) : (fallbackTime || "-"));
}

function updateCards(now) {
  const schedule = currentSchedule(now);
  const minutes = schedule.minutes;
  const current = schedule.current;
  const ended = schedule.ended;
  const next = schedule.next;

  setPeriodCard("ended", ended, "لا يوجد", "-");
  setPeriodCard("current", current, "لا توجد حصة الآن", "-");
  setPeriodCard("next", next, "انتهى اليوم الدراسي", "-");

  let progress = 0;
  let countdown = "--:--";
  let label = "متبقي من الحصة الحالية";

  if (current) {
    const start = toMinutes(current.start);
    const end = toMinutes(current.end);

    progress = Math.max(0, Math.min(100, ((minutes - start) / (end - start)) * 100));

    const remainingSeconds = Math.max(0, Math.round((end - minutes) * 60));
    countdown = `${pad(Math.floor(remainingSeconds / 60))}:${pad(remainingSeconds % 60)}`;

    updateAlert(current, remainingSeconds);
    announceStart(current, now);
  } else if (next) {
    const remainingSeconds = Math.max(0, Math.round((toMinutes(next.start) - minutes) * 60));
    countdown = `${pad(Math.floor(remainingSeconds / 60))}:${pad(remainingSeconds % 60)}`;
    label = "متبقي على الحصة القادمة";
  } else {
    label = "انتهى اليوم الدراسي";
    progress = 100;
    hideAlert();
  }

  setText("countdownLabel", label);
  setText("countdownValue", countdown);
  setText("progressPercent", `%${Math.round(progress)}`);

  const fill = el("progressFill");
  if (fill) fill.style.width = `${progress}%`;

  renderSchedule(current);
}

function statusFor(period, current) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  if (current && period.index === current.index) {
    return period.isBreak ? "فسحة الآن ☕" : "جارية ↻";
  }

  if (minutes >= toMinutes(period.end)) return "انتهت ✓";

  return "قادمة";
}

function renderSchedule(current) {
  const body = el("scheduleBody");
  if (!body) return;

  body.innerHTML = periods.map(period => {
    const rowClass = current && current.index === period.index ? "current" : "";

    return `
      <tr class="${rowClass}">
        <td class="num"><span class="num-badge">${period.isBreak ? "-" : period.index}</span></td>
        <td class="lesson">${period.name}</td>
        <td class="time">${rangeText(period)}</td>
        <td class="state"><span class="status-badge">${statusFor(period, current)}</span></td>
      </tr>
    `;
  }).join("");
}

function updateClock(now) {
  setText(
    "digitalTime",
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );

  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secondHand = el("secondHand");
  const minuteHand = el("minuteHand");
  const hourHand = el("hourHand");

  if (secondHand) secondHand.style.transform = `translateX(-50%) rotate(${seconds * 6}deg)`;
  if (minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`;
  if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hours * 30}deg)`;
}

function updateDate(now) {
  setText("weekday", new Intl.DateTimeFormat("ar-OM", { weekday: "long" }).format(now));

  setText(
    "gregorianDate",
    new Intl.DateTimeFormat("ar-OM", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now)
  );

  try {
    setText(
      "hijriDate",
      new Intl.DateTimeFormat("ar-OM-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now)
    );
  } catch {
    setText("hijriDate", "");
  }
}

function hydrateArabicLabels() {
  const endedPill = document.querySelector(".ended-card .pill");
  const currentPill = document.querySelector(".current-card .pill");
  const nextPill = document.querySelector(".next-card .pill");
  const progressLabel = document.querySelector(".progress-head span:last-child");

  if (endedPill) endedPill.innerHTML = 'الحصة المنتهية <span class="dot"></span>';
  if (currentPill) currentPill.innerHTML = 'الحصة الحالية <span class="dot"></span>';
  if (nextPill) nextPill.innerHTML = 'الحصة القادمة <span class="dot"></span>';
  if (progressLabel) progressLabel.textContent = "تقدم الحصة";
}

function buildTicks() {
  const clock = el("analogClock");
  if (!clock) return;

  const existingTicks = clock.querySelectorAll(".tick");
  if (existingTicks.length) return;

  for (let i = 0; i < 12; i++) {
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.style.transform = `rotate(${i * 30}deg)`;
    if (i % 3 !== 0) tick.style.opacity = "0.55";
    clock.prepend(tick);
  }
}

function buildTicker() {
  const ticker = el("tickerTrack");
  if (!ticker) return;

  const content = messages.concat(messages).map(message => {
    return `<span class="ticker-item">${message}</span>`;
  }).join("");

  ticker.innerHTML = content;
}

function tick() {
  const now = new Date();
  updateClock(now);
  updateDate(now);
  updateCards(now);
}

function applySchoolTheme(school) {
  const primary = school.primary_color || "#064b35";
  const secondary = school.secondary_color || "#f4b437";
  const background = school.background_color || "#f4ead8";

  document.documentElement.style.setProperty("--green", primary);
  document.documentElement.style.setProperty("--gold", secondary);
  document.documentElement.style.setProperty("--page-bg", background);
}

function setClassroomLink() {
  const link = el("classroomLink");
  if (link) link.href = `classroom.html?school=${encodeURIComponent(schoolSlug)}`;
}

function setText(id, value) {
  const item = el(id);
  if (item) item.textContent = value;
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

function updateAlert(current, remainingSeconds) {
  const alertBar = el("alertBar");
  if (!alertBar) return;

  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  if (remainingMinutes <= ALERT_BEFORE_MINUTES && remainingSeconds > 0) {
    alertBar.classList.remove("hidden", "danger");
    alertBar.textContent = `🔔 بقي ${remainingMinutes} دقائق على نهاية ${current.name}`;

    const key = `${current.id || current.index}-${remainingMinutes}`;

    if (ENABLE_SOUND_ALERT && key !== lastAlertKey && remainingMinutes === ALERT_BEFORE_MINUTES) {
      playBeep();
      lastAlertKey = key;
    }
  } else {
    hideAlert();
  }
}

function announceStart(current, now) {
  const key = `${current.id || current.index}-started`;
  const startMinutes = toMinutes(current.start);
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const diffSeconds = Math.abs((nowMinutes - startMinutes) * 60);

  if (ENABLE_SOUND_ALERT && diffSeconds < 2 && key !== lastStartedKey) {
    showTemporaryAlert(`🔔 بدأت ${current.name}`, true);
    playBeep();
    lastStartedKey = key;
  }
}

function showTemporaryAlert(text, danger = false) {
  const alertBar = el("alertBar");
  if (!alertBar) return;

  alertBar.classList.remove("hidden");
  alertBar.classList.toggle("danger", danger);
  alertBar.textContent = text;

  setTimeout(() => hideAlert(), 6000);
}

function hideAlert() {
  const alertBar = el("alertBar");
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

hydrateArabicLabels();
