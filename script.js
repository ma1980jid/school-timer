const settings = {
  schoolName: "مدرسة الشيخ سيف بن حمد الأغبري",
  schoolLogo: "icons/school_logo.png",
  timeZone: "Asia/Muscat",
  activeSchedule: "oneShift_scheduleFirst",
  activityDay: 6,
  activityPosition: "afterAssembly",
  activityEnabled: false,
  designTheme: "omani",
  visionMessages: [
    "رؤيتنا: تعليم ملهم لمستقبل مشرق",
    "رسالتنا: بيئة مدرسية آمنة ومحفزة للتعلم",
    "قيمنا: الانضباط، الإبداع، المسؤولية"
  ]
};

function applyUrlSettings() {
  const p = new URLSearchParams(location.search);

  if (p.get("schedule")) {
    settings.activeSchedule = p.get("schedule");
  }

  if (p.get("activityDay") !== null && p.get("activityDay") !== "") {
    settings.activityDay = Number(p.get("activityDay"));
  }

  if (p.get("activityPosition")) {
    settings.activityPosition = p.get("activityPosition");
  }

  if (p.get("activityEnabled") !== null) {
    settings.activityEnabled = p.get("activityEnabled") === "1";
  }

  if (p.get("theme")) {
    settings.designTheme = p.get("theme");
  }
}

applyUrlSettings();
document.documentElement.setAttribute("data-theme", settings.designTheme);

settings.schoolSlug = new URLSearchParams(location.search).get("school") || window.SCHOOL_TIMER_SLUG || "alsheikh-saif";

let supabaseClient = null;
const settingsCacheKey = "school_timer_settings_" + settings.schoolSlug;

function applyRemoteSettingsData(data) {
  if (!data) return;

  if (data.school_name) {
    settings.schoolName = data.school_name;
  }

  settings.activeSchedule = data.active_schedule || settings.activeSchedule;
  settings.activityEnabled = !!data.activity_enabled;
  settings.activityDay = data.activity_day === null || data.activity_day === undefined ? null : Number(data.activity_day);
  settings.activityPosition = data.activity_position || settings.activityPosition;
  settings.designTheme = data.theme || settings.designTheme;

  document.documentElement.setAttribute("data-theme", settings.designTheme);
}

function loadCachedSettings() {
  try {
    const cached = JSON.parse(localStorage.getItem(settingsCacheKey) || "null");
    if (cached && cached.data) {
      applyRemoteSettingsData(cached.data);
    }
  } catch (error) {}
}

function saveCachedSettings(data) {
  try {
    localStorage.setItem(settingsCacheKey, JSON.stringify({ savedAt: Date.now(), data }));
  } catch (error) {}
}

function initSupabaseClient() {
  const url = window.SCHOOL_TIMER_SUPABASE_URL;
  const key = window.SCHOOL_TIMER_SUPABASE_ANON_KEY;

  if (window.supabase && url && key) {
    supabaseClient = window.supabase.createClient(url, key);
  }
}

async function loadRemoteSettings() {
  if (!supabaseClient) return false;

  try {
    const [schoolResult, settingsResult] = await Promise.all([
      supabaseClient
        .from("schools")
        .select("school_name")
        .eq("school_slug", settings.schoolSlug)
        .maybeSingle(),
      supabaseClient
        .from("school_timer_settings")
        .select("active_schedule, activity_enabled, activity_day, activity_position, theme")
        .eq("school_slug", settings.schoolSlug)
        .maybeSingle()
    ]);

    if (settingsResult.error) {
      console.warn("تعذر جلب إعدادات المؤقت:", settingsResult.error.message);
      return false;
    }

    const merged = {
      ...(settingsResult.data || {}),
      school_name: schoolResult.data && schoolResult.data.school_name ? schoolResult.data.school_name : settings.schoolName
    };

    applyRemoteSettingsData(merged);
    saveCachedSettings(merged);
    return true;
  } catch (error) {
    console.warn("خطأ في الاتصال بـ Supabase:", error);
    return false;
  }
}

const rawSchedules = {
  oneShift_scheduleFirst: [
    ["الطابور","07:00","07:15"],
    ["الأولى","07:15","07:55"],
    ["الثانية","08:00","08:40"],
    ["الثالثة","08:45","09:25"],
    ["الرابعة","09:30","10:10"],
    ["الفسحة","10:10","10:35"],
    ["الخامسة","10:35","11:15"],
    ["السادسة","11:20","12:00"],
    ["السابعة","12:05","12:45"],
    ["الثامنة","12:50","13:30"]
  ],

  oneShift_scheduleFirstPrayer: [
    ["الطابور","07:00","07:15"],
    ["الأولى","07:15","07:55"],
    ["الثانية","07:55","08:35"],
    ["الثالثة","08:35","09:15"],
    ["الرابعة","09:15","09:55"],
    ["الفسحة","09:55","10:20"],
    ["الخامسة","10:20","11:00"],
    ["السادسة","11:00","11:40"],
    ["السابعة","11:40","12:20"],
    ["الصلاة","12:20","12:45"],
    ["الثامنة","12:45","13:30"]
  ],

  oneShift_scheduleSecond: [
    ["الطابور","07:10","07:25"],
    ["الأولى","07:25","08:05"],
    ["الثانية","08:10","08:50"],
    ["الثالثة","08:55","09:35"],
    ["الرابعة","09:40","10:20"],
    ["الفسحة","10:20","10:45"],
    ["الخامسة","10:45","11:25"],
    ["السادسة","11:30","12:10"],
    ["السابعة","12:15","12:55"],
    ["الثامنة","13:00","13:40"]
  ],

  oneShift_scheduleSecondPrayer: [
    ["الطابور","07:10","07:25"],
    ["الأولى","07:25","08:05"],
    ["الثانية","08:05","08:45"],
    ["الثالثة","08:45","09:25"],
    ["الرابعة","09:25","10:05"],
    ["الفسحة","10:05","10:30"],
    ["الخامسة","10:35","11:15"],
    ["السادسة","11:15","11:55"],
    ["السابعة","11:55","12:35"],
    ["الصلاة","12:35","13:00"],
    ["الثامنة","13:00","13:40"]
  ],

  oneShift_summer: [
    ["الطابور","07:00","07:10"],
    ["الأولى","07:10","07:50"],
    ["الثانية","07:50","08:30"],
    ["الثالثة","08:30","09:10"],
    ["الرابعة","09:10","09:50"],
    ["الفسحة","09:50","10:20"],
    ["الخامسة","10:20","11:00"],
    ["السادسة","11:00","11:40"],
    ["السابعة","11:40","12:20"],
    ["الثامنة","12:20","13:00"]
  ],

  oneShift_ramadan: [
    ["الطابور","07:10","07:20"],
    ["الأولى","07:20","07:55"],
    ["الثانية","07:55","08:30"],
    ["الثالثة","08:30","09:05"],
    ["الرابعة","09:05","09:40"],
    ["الفسحة","09:40","09:50"],
    ["الخامسة","09:50","10:25"],
    ["السادسة","10:25","11:00"],
    ["السابعة","11:00","11:35"],
    ["الثامنة","11:35","12:10"]
  ],

  twoMorning_scheduleFirst: [
    ["الطابور","07:00","07:10"],
    ["الأولى","07:10","07:45"],
    ["الثانية","07:50","08:25"],
    ["الثالثة","08:30","09:05"],
    ["الرابعة","09:10","09:45"],
    ["الفسحة","09:45","10:05"],
    ["الخامسة","10:05","10:40"],
    ["السادسة","10:45","11:20"],
    ["السابعة","11:25","12:00"]
  ],

  twoMorning_ramadan: [
    ["الطابور","07:10","07:20"],
    ["الأولى","07:20","07:55"],
    ["الثانية","07:55","08:30"],
    ["الثالثة","08:30","09:05"],
    ["الرابعة","09:05","09:40"],
    ["الفسحة","09:40","09:50"],
    ["الخامسة","09:50","10:25"],
    ["السادسة","10:25","11:00"],
    ["السابعة","11:00","11:35"]
  ],

  twoEvening_scheduleFirst: [
    ["الطابور","12:10","12:20"],
    ["الأولى","12:20","12:55"],
    ["الثانية","12:55","13:30"],
    ["الثالثة","13:30","14:05"],
    ["الرابعة","14:05","14:40"],
    ["الفسحة","14:40","15:00"],
    ["الخامسة","15:00","15:35"],
    ["السادسة","15:35","16:10"],
    ["السابعة","16:10","16:45"]
  ],

  twoEvening_scheduleFirstPrayer: [
    ["الطابور","12:10","12:20"],
    ["الأولى","12:20","12:55"],
    ["صلاة الظهر","12:55","13:10"],
    ["الثانية","13:10","13:40"],
    ["الثالثة","13:40","14:10"],
    ["الرابعة","14:10","14:40"],
    ["الفسحة","14:40","15:00"],
    ["الخامسة","15:00","15:30"],
    ["السادسة","15:30","16:00"],
    ["صلاة العصر","16:00","16:15"],
    ["السابعة","16:15","16:45"]
  ],

  twoEvening_ramadan: [
    ["الطابور","11:40","11:45"],
    ["الأولى","11:45","12:20"],
    ["الثانية","12:20","12:55"],
    ["الثالثة","12:55","13:30"],
    ["الرابعة","13:30","14:05"],
    ["الفسحة","14:05","14:15"],
    ["الخامسة","14:15","14:50"],
    ["السادسة","14:50","15:25"],
    ["السابعة","15:25","16:00"]
  ]
};

rawSchedules.oneShift_exam = rawSchedules.oneShift_scheduleFirst;
rawSchedules.twoMorning_exam = rawSchedules.twoMorning_scheduleFirst;
rawSchedules.twoMorning_scheduleSecond = rawSchedules.twoMorning_scheduleFirst;
rawSchedules.twoEvening_exam = rawSchedules.twoEvening_scheduleFirst;
rawSchedules.twoEvening_scheduleSecond = rawSchedules.twoEvening_scheduleFirst;
rawSchedules.twoEvening_scheduleSecondPrayer = rawSchedules.twoEvening_scheduleFirstPrayer;

const classNames = new Set([
  "الأولى",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
  "السابعة",
  "الثامنة"
]);

const dayMap = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function schoolKind(key = settings.activeSchedule) {
  return key.split("_")[0];
}

function isRamadan(key = settings.activeSchedule) {
  return key.includes("ramadan");
}

function isSummer(key = settings.activeSchedule) {
  return key.includes("summer");
}

function isPrayer(key = settings.activeSchedule) {
  return key.includes("Prayer");
}

function activityAllowed(key = settings.activeSchedule) {
  const k = schoolKind(key);

  return !isRamadan(key)
    && !isSummer(key)
    && key.includes("schedule")
    && !(k === "twoEvening" && isPrayer(key));
}

function activityRules(kind) {
  if (kind === "oneShift") {
    return { activity: 40, breakDur: 20 };
  }

  if (kind === "twoEvening") {
    return { activity: 30, breakDur: 15 };
  }

  return { activity: 30, breakDur: 20 };
}

function typeOf(name) {
  if (name.includes("فسحة")) return "break";
  if (name.includes("صلاة") || name === "الصلاة") return "prayer";
  if (name.includes("نشاط")) return "activity";
  return "normal";
}

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const e = el(id);
  if (e) e.textContent = value;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  m = (m % 1440 + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function rowDuration(row) {
  let s = toMinutes(row[1]);
  let e = toMinutes(row[2]);

  if (e <= s) {
    e += 1440;
  }

  return e - s;
}

function formatTime(t) {
  if (!t || typeof t !== "string") {
    return "--";
  }

  const [h, m] = t.split(":").map(Number);
  return `${pad(h)}:${pad(m)}`;
}

function periodRange(p) {
  return p ? `${formatTime(p.end)} - ${formatTime(p.start)}` : "--";
}

function setTimeRange(id, p) {
  const e = el(id);
  if (!e) return;

  e.textContent = periodRange(p);
  e.setAttribute("dir", "ltr");
}

function buildActivityRows(rows, position, kind) {
  const rule = activityRules(kind);
  const startDay = toMinutes(rows[0][1]);

  const rawFinalEnd = toMinutes(rows.at(-1)[2]);
  const finalEnd = rawFinalEnd <= startDay ? rawFinalEnd + 1440 : rawFinalEnd;
  const totalSpan = finalEnd - startDay;

  const expanded = [];

  rows.forEach((row, index) => {
    const next = rows[index + 1];
    const type = typeOf(row[0]);

    const segment = {
      name: row[0],
      type,
      dur: type === "break" ? rule.breakDur : rowDuration(row),
      gap: next ? Math.max(0, toMinutes(next[1]) - toMinutes(row[2])) : 0
    };

    expanded.push(segment);

    if (position === "afterAssembly" && row[0] === "الطابور") {
      expanded.at(-1).gap = 0;
      expanded.push({
        name: "النشاط",
        type: "activity",
        dur: rule.activity,
        gap: segment.gap
      });
    }

    if (position === "afterBreak" && type === "break") {
      expanded.at(-1).gap = 0;
      expanded.push({
        name: "النشاط",
        type: "activity",
        dur: rule.activity,
        gap: segment.gap
      });
    }
  });

  const fixed = expanded
    .filter(item => !classNames.has(item.name))
    .reduce((sum, item) => sum + item.dur, 0);

  const gaps = expanded.reduce((sum, item) => sum + item.gap, 0);
  const classes = expanded.filter(item => classNames.has(item.name));
  const classTotal = Math.max(0, totalSpan - fixed - gaps);

  const base = Math.floor(classTotal / classes.length);
  const rem = classTotal - base * classes.length;

  let c = 0;

  expanded.forEach(item => {
    if (classNames.has(item.name)) {
      item.dur = base + (c < rem ? 1 : 0);
      c++;
    }
  });

  let t = startDay;

  return expanded.map(item => {
    const start = t;
    const end = t + item.dur;

    t = end + item.gap;

    return [
      item.name,
      minutesToTime(start),
      minutesToTime(end)
    ];
  });
}

function getOmanDate(date = new Date()) {
  if (settings.timeZone === "Asia/Muscat") {
    return new Date(date.getTime() + 4 * 60 * 60 * 1000);
  }

  return date;
}

function getOmanDay(date = new Date()) {
  if (settings.timeZone === "Asia/Muscat") {
    return getOmanDate(date).getUTCDay();
  }

  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timeZone,
    weekday: "short"
  }).format(date);

  return dayMap[name] ?? date.getDay();
}

function shouldUseActivity() {
  return settings.activityEnabled
    && activityAllowed()
    && getOmanDay() === settings.activityDay;
}

function getRowsForActiveSchedule() {
  const rows =
    rawSchedules[settings.activeSchedule] ||
    rawSchedules.oneShift_scheduleFirst;

  return shouldUseActivity()
    ? buildActivityRows(rows, settings.activityPosition, schoolKind())
    : rows;
}

function toPeriods(rows) {
  const cut = Math.ceil(rows.length / 2);

  return rows.map((row, index) => ({
    name: row[0],
    start: row[1],
    end: row[2],
    type: typeOf(row[0]),
    col: index < cut ? 1 : 2
  }));
}

function getActivePeriods() {
  return toPeriods(getRowsForActiveSchedule());
}

function updateViewportHeight() {
  const viewport = window.visualViewport;

  document.documentElement.style.setProperty(
    "--app-height",
    `${viewport ? viewport.height : innerHeight}px`
  );
}

updateViewportHeight();

addEventListener("resize", updateViewportHeight, { passive: true });

addEventListener("orientationchange", () => {
  setTimeout(updateViewportHeight, 250);
}, { passive: true });

if (window.visualViewport) {
  visualViewport.addEventListener("resize", updateViewportHeight, { passive: true });
  visualViewport.addEventListener("scroll", updateViewportHeight, { passive: true });
}

function normalizePeriod(p, base) {
  let s = toMinutes(p.start);
  let e = toMinutes(p.end);

  if (s < base) {
    s += 1440;
  }

  if (e <= s) {
    e += 1440;
  }

  return {
    ...p,
    startMinutes: s,
    endMinutes: e
  };
}

function getOmanTimeParts(date = new Date()) {
  if (settings.timeZone === "Asia/Muscat") {
    const oman = getOmanDate(date);

    return {
      hour: oman.getUTCHours(),
      minute: oman.getUTCMinutes(),
      second: oman.getUTCSeconds()
    };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);

  const values = {};

  parts.forEach(part => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  let h = Number(values.hour);

  if (h === 24) {
    h = 0;
  }

  return {
    hour: h,
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getSchedule() {
  const now = new Date();
  const time = getOmanTimeParts(now);

  const raw =
    time.hour * 60 +
    time.minute +
    time.second / 60;

  const visible = getActivePeriods();
  const firstVisible = visible[0] || null;

  if (!firstVisible) {
    return {
      now,
      time,
      currentMinutes: raw,
      list: [],
      first: null,
      last: null,
      current: null,
      previous: null,
      next: null,
      beforeSchool: false,
      afterSchool: false
    };
  }

  const base = toMinutes(firstVisible.start);
  const list = visible.map(p => normalizePeriod(p, base));
  const ordered = [...list].sort((a, b) => a.startMinutes - b.startMinutes);

  const first = ordered[0];
  const last = ordered.at(-1);

  let currentMinutes = raw;

  const crosses = last.endMinutes >= 1440;
  const lastAfter = last.endMinutes - 1440;

  if (crosses && raw <= lastAfter) {
    currentMinutes += 1440;
  }

  const current =
    ordered.find(p =>
      currentMinutes >= p.startMinutes &&
      currentMinutes < p.endMinutes
    ) || null;

  const previous =
    [...ordered].reverse().find(p =>
      currentMinutes >= p.endMinutes
    ) || null;

  const next =
    ordered.find(p =>
      currentMinutes < p.startMinutes
    ) || null;

  return {
    now,
    time,
    currentMinutes,
    list,
    first,
    last,
    current,
    previous,
    next,
    beforeSchool: currentMinutes < first.startMinutes,
    afterSchool: currentMinutes >= last.endMinutes
  };
}

function updateCards(s = getSchedule()) {
  setText("previousName", s.previous ? s.previous.name : "--");
  setTimeRange("previousTime", s.previous);

  if (s.current) {
    setText("currentName", s.current.name);
    setTimeRange("currentTime", s.current);
  } else if (s.beforeSchool) {
    setText("currentName", "لم يبدأ الدوام");
    setTimeRange("currentTime", s.first);
  } else if (s.afterSchool) {
    setText("currentName", "--");
    setTimeRange("currentTime", null);
  } else {
    setText("currentName", "لا توجد حصة");
    setTimeRange("currentTime", null);
  }

  setText("nextName", s.next ? s.next.name : "--");
  setTimeRange("nextTime", s.next);
}

function updateClock(t = getOmanTimeParts()) {
  setText(
    "digitalClock",
    `${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`
  );
}

let lastDateUpdateAt = 0;

function updateDate(now = new Date(), force = false) {
  const currentTime = Date.now();

  if (!force && currentTime - lastDateUpdateAt < 60000) {
    return;
  }

  lastDateUpdateAt = currentTime;

  setText(
    "weekday",
    new Intl.DateTimeFormat("ar-OM", {
      timeZone: settings.timeZone,
      weekday: "long"
    }).format(now)
  );

  setText(
    "gregorianDate",
    new Intl.DateTimeFormat("ar-OM", {
      timeZone: settings.timeZone,
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now)
  );

  try {
    setText(
      "hijriDate",
      new Intl.DateTimeFormat("ar-OM-u-ca-islamic", {
        timeZone: settings.timeZone,
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now)
    );
  } catch (error) {
    setText("hijriDate", "");
  }
}

function formatCountdown(total) {
  const seconds = Math.max(0, Math.floor(total));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
}

function updateRemaining(s = getSchedule()) {
  if (s.current) {
    setText("countLabel", "متبقي من الحصة الحالية");
    setText(
      "remainingTime",
      formatCountdown((s.current.endMinutes - s.currentMinutes) * 60)
    );
    return;
  }

  if (s.beforeSchool && s.first) {
    setText("countLabel", "متبقي على بداية الدوام");
    setText(
      "remainingTime",
      formatCountdown((s.first.startMinutes - s.currentMinutes) * 60)
    );
    return;
  }

  if (s.next) {
    setText("countLabel", "متبقي على الحصة القادمة");
    setText(
      "remainingTime",
      formatCountdown((s.next.startMinutes - s.currentMinutes) * 60)
    );
    return;
  }

  setText("countLabel", "انتهى اليوم الدراسي");
  setText("remainingTime", "00:00");
}

function createCell(text, className) {
  const cell = document.createElement("td");

  cell.textContent = text;

  if (className) {
    cell.className = className;
  }

  return cell;
}

function createStatusCell(state) {
  const cell = document.createElement("td");
  cell.className = "status-cell";

  const span = document.createElement("span");
  span.className = "state-text";
  span.textContent = state;

  cell.append(span);

  return cell;
}

function createTimeCell(p) {
  const cell = document.createElement("td");

  cell.className = "time-cell";
  cell.textContent = periodRange(p);
  cell.setAttribute("dir", "ltr");

  return cell;
}

function createRow(p, s) {
  let state = "قادمة";

  if (s.current === p) {
    state = "جارية";
  } else if (s.currentMinutes >= p.endMinutes) {
    state = "انتهت";
  }

  const row = document.createElement("tr");

  if (state === "جارية") {
    row.classList.add("current-row");
  }

  if (p.type === "break") {
    row.classList.add("break-row");
  }

  if (p.type === "prayer") {
    row.classList.add("prayer-row");
  }

  if (p.type === "activity") {
    row.classList.add("activity-row");
  }

  row.append(
    createCell(p.name),
    createTimeCell(p),
    createStatusCell(state)
  );

  return row;
}

let lastTableSignature = "";

function renderTable(s = getSchedule()) {
  const stateFor = p => s.current === p ? "جارية" : (s.currentMinutes >= p.endMinutes ? "انتهت" : "قادمة");
  const signature = s.list.map(p => `${p.name}|${p.start}|${p.end}|${p.type}|${stateFor(p)}`).join("||");
  if (signature === lastTableSignature) return;
  lastTableSignature = signature;

  const col1 = el("scheduleCol1");
  const col2 = el("scheduleCol2");

  if (col1) {
    col1.replaceChildren(
      ...s.list
        .filter(p => p.col === 1)
        .map(p => createRow(p, s))
    );
  }

  if (col2) {
    col2.replaceChildren(
      ...s.list
        .filter(p => p.col === 2)
        .map(p => createRow(p, s))
    );
  }
}

let visionIndex = 0;

function updateVision() {
  if (!settings.visionMessages.length) {
    return;
  }

  setText("visionText", settings.visionMessages[visionIndex]);
  visionIndex = (visionIndex + 1) % settings.visionMessages.length;
}

function init() {
  const logo = el("schoolLogo");

  if (logo) {
    logo.src = settings.schoolLogo;
  }

  setText("schoolName", settings.schoolName);

  updateVision();
}

function tick() {
  const s = getSchedule();

  updateClock(s.time);
  updateDate(s.now);
  updateCards(s);
  updateRemaining(s);
  renderTable(s);
}

async function refreshRemoteSettingsAfterStart() {
  const changed = await loadRemoteSettings();
  if (!changed) return;

  setText("schoolName", settings.schoolName);
  lastTableSignature = "";
  updateDate(new Date(), true);
  tick();
}

function startApp() {
  initSupabaseClient();
  loadCachedSettings();

  init();
  updateDate(new Date(), true);
  tick();

  setTimeout(refreshRemoteSettingsAfterStart, 800);
  setInterval(tick, 1000);
  setInterval(updateVision, 5000);
}

startApp();
