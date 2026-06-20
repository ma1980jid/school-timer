const settings = {
  schoolName: "مدرسة الشيخ سيف بن حمد الأغبري",
  schoolLogo: "icons/school_logo.png",
  timeZone: "Asia/Muscat",

  visionMessages: [
    "رؤيتنا: تعليم ملهم لمستقبل مشرق",
    "رسالتنا: بيئة مدرسية آمنة ومحفزة للتعلم",
    "قيمنا: الانضباط، الإبداع، المسؤولية"
  ],

  showPrayer: true,

  // الأيام: 0 الأحد، 1 الاثنين، 2 الثلاثاء، 3 الأربعاء، 4 الخميس، 5 الجمعة، 6 السبت
  activityDay: 1
};

/* جدول تجريبي يبدأ الساعة 1 صباحًا */
const defaultPeriods = [
const defaultPeriods = [
{name:"الطابور",start:"12:30",end:"12:45",type:"normal",col:1},
{name:"الأولى",start:"12:45",end:"13:25",type:"normal",col:1},
{name:"الثانية",start:"13:25",end:"14:05",type:"normal",col:1},
{name:"الثالثة",start:"14:05",end:"14:45",type:"normal",col:1},
{name:"الرابعة",start:"14:45",end:"15:25",type:"normal",col:1},

{name:"الفسحة",start:"15:25",end:"15:45",type:"break",col:2},
{name:"الخامسة",start:"15:45",end:"16:25",type:"normal",col:2},
{name:"السادسة",start:"16:25",end:"17:05",type:"normal",col:2},
{name:"السابعة",start:"17:05",end:"17:45",type:"normal",col:2},
{name:"الصلاة",start:"17:45",end:"18:05",type:"prayer",col:2,optionalPrayer:true},
{name:"الثامنة",start:"18:05",end:"18:45",type:"normal",col:2}
];

const periods = defaultPeriods;

const messages = [
  "مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري",
  "العلم نور",
  "الانضباط طريق النجاح",
  "نسعى لبناء مستقبل تعليمي متميز"
];

const dayMap = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function updateViewportHeight(){
  const viewport = window.visualViewport;
  const height = viewport ? viewport.height : window.innerHeight;

  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

updateViewportHeight();

window.addEventListener("resize", updateViewportHeight, { passive: true });

window.addEventListener("orientationchange", () => {
  setTimeout(updateViewportHeight, 250);
}, { passive: true });

if(window.visualViewport){
  window.visualViewport.addEventListener("resize", updateViewportHeight, { passive: true });
  window.visualViewport.addEventListener("scroll", updateViewportHeight, { passive: true });
}

function el(id){
  return document.getElementById(id);
}

function setText(id, value){
  const element = el(id);

  if(element){
    element.textContent = value;
  }
}

function pad(number){
  return String(number).padStart(2, "0");
}

function toMinutes(time){
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(time){
  if(!time || typeof time !== "string"){
    return "--";
  }

  const [hours, minutes] = time.split(":").map(Number);
  return `${pad(hours)}:${pad(minutes)}`;
}

function periodRange(period){
  if(!period){
    return "--";
  }

  // عرض الوقت من اليمين إلى اليسار بصريًا
  return `${formatTime(period.end)} - ${formatTime(period.start)}`;
}

function setTimeRange(id, period){
  const element = el(id);

  if(!element){
    return;
  }

  element.textContent = periodRange(period);
  element.setAttribute("dir", "ltr");
}

function normalizePeriod(period, baseStart){
  let startMinutes = toMinutes(period.start);
  let endMinutes = toMinutes(period.end);

  if(startMinutes < baseStart){
    startMinutes += 1440;
  }

  if(endMinutes <= startMinutes){
    endMinutes += 1440;
  }

  return {
    ...period,
    startMinutes,
    endMinutes
  };
}

function getDurationMinutes(period){
  let startMinutes = period.startMinutes ?? toMinutes(period.start);
  let endMinutes = period.endMinutes ?? toMinutes(period.end);

  if(endMinutes <= startMinutes){
    endMinutes += 1440;
  }

  return Math.round(endMinutes - startMinutes);
}

function formatDuration(period){
  return `${getDurationMinutes(period)} دقيقة`;
}

function getOmanTimeParts(date = new Date()){
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);

  const values = {};

  parts.forEach(part => {
    if(part.type !== "literal"){
      values[part.type] = part.value;
    }
  });

  let hour = Number(values.hour);

  if(hour === 24){
    hour = 0;
  }

  return {
    hour,
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getOmanDay(date = new Date()){
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timeZone,
    weekday: "short"
  }).format(date);

  return dayMap[dayName] ?? new Date().getDay();
}

function getVisiblePeriods(){
  const today = getOmanDay();

  return periods.filter(period => {
    if(period.optionalPrayer && !settings.showPrayer){
      return false;
    }

    if(period.activityOnly && today !== settings.activityDay){
      return false;
    }

    return true;
  });
}

function getSchedule(){
  const now = new Date();
  const time = getOmanTimeParts(now);

  const rawCurrentMinutes =
    time.hour * 60 +
    time.minute +
    time.second / 60;

  const visibleList = getVisiblePeriods();
  const firstVisible = visibleList[0] || null;

  if(!firstVisible){
    return {
      now,
      time,
      currentMinutes: rawCurrentMinutes,
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

  const baseStart = toMinutes(firstVisible.start);
  const list = visibleList.map(period => normalizePeriod(period, baseStart));
  const ordered = [...list].sort((a, b) => a.startMinutes - b.startMinutes);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  let currentMinutes = rawCurrentMinutes;

  const crossesMidnight = last.endMinutes >= 1440;
  const lastEndAfterMidnight = last.endMinutes - 1440;

  if(crossesMidnight && rawCurrentMinutes <= lastEndAfterMidnight){
    currentMinutes += 1440;
  }

  const current = ordered.find(period =>
    currentMinutes >= period.startMinutes &&
    currentMinutes < period.endMinutes
  ) || null;

  const previous = [...ordered].reverse().find(period =>
    currentMinutes >= period.endMinutes
  ) || null;

  const next = ordered.find(period =>
    currentMinutes < period.startMinutes
  ) || null;

  const beforeSchool = currentMinutes < first.startMinutes;
  const afterSchool = currentMinutes >= last.endMinutes;

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
    beforeSchool,
    afterSchool
  };
}

function updateCards(){
  const schedule = getSchedule();

  setText("previousName", schedule.previous ? schedule.previous.name : "--");
  setTimeRange("previousTime", schedule.previous);

  if(schedule.current){
    setText("currentName", schedule.current.name);
    setTimeRange("currentTime", schedule.current);
  }else if(schedule.beforeSchool){
    setText("currentName", "لم يبدأ الدوام");
    setTimeRange("currentTime", schedule.first);
  }else if(schedule.afterSchool){
    setText("currentName", "انتهى الدوام");
    setTimeRange("currentTime", null);
  }else{
    setText("currentName", "لا توجد حصة");
    setTimeRange("currentTime", null);
  }

  setText("nextName", schedule.next ? schedule.next.name : "--");
  setTimeRange("nextTime", schedule.next);
}

function updateClock(){
  const time = getOmanTimeParts();

  setText("digitalClock", `${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`);
}

function updateDate(){
  const now = new Date();

  setText("weekday", new Intl.DateTimeFormat("ar-OM", {
    timeZone: settings.timeZone,
    weekday: "long"
  }).format(now));

  setText("gregorianDate", new Intl.DateTimeFormat("ar-OM", {
    timeZone: settings.timeZone,
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now));

  try{
    setText("hijriDate", new Intl.DateTimeFormat("ar-OM-u-ca-islamic", {
      timeZone: settings.timeZone,
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now));
  }catch(error){
    setText("hijriDate", "");
  }
}

function formatCountdown(totalSeconds){
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;

  if(hours > 0){
    return `${pad(hours)}:${pad(minutes)}:${pad(restSeconds)}`;
  }

  return `${pad(minutes)}:${pad(restSeconds)}`;
}

function updateRemaining(){
  const schedule = getSchedule();

  if(schedule.current){
    const remainingSeconds =
      (schedule.current.endMinutes - schedule.currentMinutes) * 60;

    setText("countLabel", "متبقي من الحصة الحالية");
    setText("remainingTime", formatCountdown(remainingSeconds));
    return;
  }

  if(schedule.beforeSchool && schedule.first){
    const remainingSeconds =
      (schedule.first.startMinutes - schedule.currentMinutes) * 60;

    setText("countLabel", "متبقي على بداية الدوام");
    setText("remainingTime", formatCountdown(remainingSeconds));
    return;
  }

  if(schedule.next){
    const remainingSeconds =
      (schedule.next.startMinutes - schedule.currentMinutes) * 60;

    setText("countLabel", "متبقي على الحصة القادمة");
    setText("remainingTime", formatCountdown(remainingSeconds));
    return;
  }

  setText("countLabel", "انتهى اليوم الدراسي");
  setText("remainingTime", "00:00");
}

function createCell(text, className){
  const cell = document.createElement("td");

  cell.textContent = text;

  if(className){
    cell.className = className;
  }

  return cell;
}

function createStatusCell(state, period){
  const cell = document.createElement("td");
  const stateText = document.createElement("span");
  const durationText = document.createElement("small");

  cell.className = "status-cell";
  stateText.className = "state-text";
  durationText.className = "duration-text";

  stateText.textContent = state;
  durationText.textContent = formatDuration(period);

  cell.append(stateText, durationText);

  return cell;
}

function createTimeCell(period){
  const cell = document.createElement("td");

  cell.className = "time-cell";
  cell.textContent = periodRange(period);
  cell.setAttribute("dir", "ltr");

  return cell;
}

function createRow(period, schedule){
  let state = "قادمة";

  if(schedule.current === period){
    state = "جارية";
  }else if(schedule.currentMinutes >= period.endMinutes){
    state = "انتهت";
  }

  const row = document.createElement("tr");

  if(state === "جارية"){
    row.classList.add("current-row");
  }

  if(period.type === "break"){
    row.classList.add("break-row");
  }

  if(period.type === "prayer"){
    row.classList.add("prayer-row");
  }

  if(period.type === "activity"){
    row.classList.add("activity-row");
  }

  row.append(
    createCell(period.name),
    createTimeCell(period),
    createStatusCell(state, period)
  );

  return row;
}

function renderTable(){
  const schedule = getSchedule();
  const column1 = el("scheduleCol1");
  const column2 = el("scheduleCol2");

  if(column1){
    const rows = schedule.list
      .filter(period => period.col === 1)
      .map(period => createRow(period, schedule));

    column1.replaceChildren(...rows);
  }

  if(column2){
    const rows = schedule.list
      .filter(period => period.col === 2)
      .map(period => createRow(period, schedule));

    column2.replaceChildren(...rows);
  }
}

let visionIndex = 0;

function updateVision(){
  if(!settings.visionMessages.length){
    return;
  }

  setText("visionText", settings.visionMessages[visionIndex]);

  visionIndex = (visionIndex + 1) % settings.visionMessages.length;
}

function createTickerGroup(){
  const group = document.createElement("div");

  group.className = "ticker-group";

  messages.forEach(message => {
    const item = document.createElement("span");

    item.className = "ticker-item";
    item.textContent = message;

    group.appendChild(item);
  });

  return group;
}

function updateTicker(){
  const ticker = el("tickerTrack");

  if(!ticker){
    return;
  }

  ticker.replaceChildren(createTickerGroup(), createTickerGroup());
}

function init(){
  const logo = el("schoolLogo");

  if(logo){
    logo.src = settings.schoolLogo;
  }

  setText("schoolName", settings.schoolName);
  updateVision();
  updateTicker();
}

function tick(){
  updateClock();
  updateDate();
  updateCards();
  updateRemaining();
  renderTable();
}

init();
tick();

setInterval(tick, 1000);
setInterval(updateVision, 5000);
