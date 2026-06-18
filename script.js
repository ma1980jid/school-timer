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

const defaultPeriods = [
  { name: "الطابور",  start: "01:00", end: "01:15", type: "normal", col: 1 },
  { name: "الأولى",   start: "01:15", end: "01:55", type: "normal", col: 1 },
  { name: "الثانية",  start: "01:55", end: "02:35", type: "normal", col: 1 },
  { name: "الثالثة",  start: "02:35", end: "03:15", type: "normal", col: 1 },
  { name: "الرابعة",  start: "03:15", end: "03:55", type: "normal", col: 1 },

  { name: "الفسحة",   start: "03:55", end: "04:15", type: "break",  col: 2 },
  { name: "الخامسة",  start: "04:15", end: "04:55", type: "normal", col: 2 },
  { name: "السادسة",  start: "04:55", end: "05:35", type: "normal", col: 2 },
  { name: "السابعة",  start: "05:35", end: "06:15", type: "normal", col: 2 },
  { name: "الصلاة",   start: "06:15", end: "06:35", type: "prayer", col: 2, optionalPrayer: true },
  { name: "الثامنة",  start: "06:35", end: "07:15", type: "normal", col: 2 }
];

const periods = defaultPeriods;

const messages = [
  "مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري",
  "العلم نور",
  "الانضباط طريق النجاح",
  "نسعى لبناء مستقبل تعليمي متميز"
];

const dayMap = {
  Sun:0,
  Mon:1,
  Tue:2,
  Wed:3,
  Thu:4,
  Fri:5,
  Sat:6
};

function formatTimeRange(start, end) {
  if (!start || !end) return "--";
  return `${start} - ${end}`;
}

function loadPeriods(){
  const stored = readStoredPeriods();

  if(stored && stored.length){
    return stored;
  }

  return defaultPeriods;
}

function readStoredPeriods(){
  const keys = [
    "schoolTimerPeriods",
    "schoolPeriods",
    "periods",
    "schoolSchedule",
    "schoolSettings",
    "schoolTimerSettings"
  ];

  try{
    for(const key of keys){
      const raw = localStorage.getItem(key);

      if(!raw){
        continue;
      }

      const data = JSON.parse(raw);
      const extracted = extractPeriods(data);

      if(extracted && extracted.length){
        return extracted;
      }
    }
  }catch(error){
    return null;
  }

  return null;
}

function extractPeriods(data){
  if(Array.isArray(data)){
    return cleanPeriods(data);
  }

  if(!data || typeof data !== "object"){
    return null;
  }

  const candidates = [
    data.periods,
    data.schedule,
    data.schoolPeriods,
    data.schoolSchedule,
    data.settings && data.settings.periods,
    data.schoolSettings && data.schoolSettings.periods
  ];

  for(const candidate of candidates){
    if(Array.isArray(candidate)){
      return cleanPeriods(candidate);
    }
  }

  return null;
}

function cleanPeriods(list){
  return list
    .map((period,index)=>{
      if(!period || !period.name || !period.start || !period.end){
        return null;
      }

      return {
        name:String(period.name),
        start:String(period.start),
        end:String(period.end),
        type:period.type || "normal",
        col:Number(period.col) || (index < 5 ? 1 : 2),
        optionalPrayer:Boolean(period.optionalPrayer),
        activityOnly:Boolean(period.activityOnly)
      };
    })
    .filter(Boolean);
}

function updateViewportHeight(){
  const viewport = window.visualViewport;
  const height = viewport ? viewport.height : window.innerHeight;

  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

updateViewportHeight();

window.addEventListener("resize", updateViewportHeight, {passive:true});

window.addEventListener("orientationchange", ()=>{
  setTimeout(updateViewportHeight, 250);
}, {passive:true});

if(window.visualViewport){
  window.visualViewport.addEventListener("resize", updateViewportHeight, {passive:true});
  window.visualViewport.addEventListener("scroll", updateViewportHeight, {passive:true});
}

function el(id){
  return document.getElementById(id);
}

function setText(id,value){
  const element = el(id);

  if(element){
    element.textContent = value;
  }
}

function pad(number){
  return String(number).padStart(2,"0");
}

function toMinutes(time){
  const [hours,minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function formatTime(time){
  if(!time || typeof time !== "string"){
    return "--";
  }

  const [hours,minutes] = time.split(":").map(Number);

  return `${pad(hours)}:${pad(minutes)}`;
}

function normalizePeriod(period,baseStart){
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
  const parts = new Intl.DateTimeFormat("en-GB",{
    timeZone:settings.timeZone,
    hour12:false,
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  }).formatToParts(date);

  const values = {};

  parts.forEach(part=>{
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
    minute:Number(values.minute),
    second:Number(values.second)
  };
}

function getOmanDay(date = new Date()){
  const dayName = new Intl.DateTimeFormat("en-US",{
    timeZone:settings.timeZone,
    weekday:"short"
  }).format(date);

  return dayMap[dayName] ?? new Date().getDay();
}

function getVisiblePeriods(){
  const today = getOmanDay();

  return periods.filter(period=>{
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
      currentMinutes:rawCurrentMinutes,
      list:[],
      first:null,
      last:null,
      current:null,
      previous:null,
      next:null,
      beforeSchool:false,
      afterSchool:false
    };
  }

  const baseStart = toMinutes(firstVisible.start);
  const list = visibleList.map(period => normalizePeriod(period,baseStart));
  const ordered = [...list].sort((a,b)=>a.startMinutes - b.startMinutes);
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

/* 
  هذه الدالة هي الأهم:
  تجعل الوقت يظهر بصيغة:
  بداية الحصة - نهاية الحصة
*/
function periodRange(period){
  if(!period){
    return "--";
  }

  return `${formatTime(period.start)} - ${formatTime(period.end)}`;
}
/*
  بدل إنشاء أجزاء كثيرة للوقت، نجعله نصًا واحدًا ثابتًا.
  هذا يمنع الوميض ويمنع انعكاس الوقت.
*/
function createTimeRange(period){
  const span = document.createElement("span");

  span.className = "time-range";
  span.textContent = periodRange(period);
  span.setAttribute("dir","ltr");

  span.style.setProperty("direction","ltr","important");
  span.style.setProperty("unicode-bidi","isolate","important");
  span.style.setProperty("white-space","nowrap","important");
  span.style.setProperty("display","inline-block","important");

  return span;
}

function setTimeRange(id,period){
  const element = el(id);

  if(!element){
    return;
  }

  if(!period){
    element.textContent = "--";
    return;
  }

  element.replaceChildren(createTimeRange(period));
}

function cardTime(period){
  if(!period){
    return "--";
  }

  return `${formatTime(period.start)} - ${formatTime(period.end)}`;
}

function setCardTime(id, period){
  const element = document.getElementById(id);

  if(!element){
    return;
  }

  element.textContent = cardTime(period);
  element.setAttribute("dir", "ltr");
}

function updateCards(){
  const schedule = getSchedule();

  setText("previousName", schedule.previous ? schedule.previous.name : "--");
  setCardTime("previousTime", schedule.previous);

  if(schedule.current){
    setText("currentName", schedule.current.name);
    setCardTime("currentTime", schedule.current);
  }else if(schedule.beforeSchool){
    setText("currentName", "لم يبدأ الدوام");
    setCardTime("currentTime", schedule.first);
  }else if(schedule.afterSchool){
    setText("currentName", "انتهى الدوام");
    setCardTime("currentTime", null);
  }else{
    setText("currentName", "لا توجد حصة");
    setCardTime("currentTime", null);
  }

  setText("nextName", schedule.next ? schedule.next.name : "--");
  setCardTime("nextTime", schedule.next);
}

function updateClock(){
  const time = getOmanTimeParts();

  setText(
    "digitalClock",
    `${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`
  );
}

function updateDate(){
  const now = new Date();

  setText("weekday", new Intl.DateTimeFormat("ar-OM",{
    timeZone:settings.timeZone,
    weekday:"long"
  }).format(now));

  setText("gregorianDate", new Intl.DateTimeFormat("ar-OM",{
    timeZone:settings.timeZone,
    day:"numeric",
    month:"long",
    year:"numeric"
  }).format(now));

  try{
    setText("hijriDate", new Intl.DateTimeFormat("ar-OM-u-ca-islamic",{
      timeZone:settings.timeZone,
      day:"numeric",
      month:"long",
      year:"numeric"
    }).format(now));
  }catch(error){
    setText("hijriDate","");
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

    setText("countLabel","متبقي من الحصة الحالية");
    setText("remainingTime",formatCountdown(remainingSeconds));
    return;
  }

  if(schedule.beforeSchool && schedule.first){
    const remainingSeconds =
      (schedule.first.startMinutes - schedule.currentMinutes) * 60;

    setText("countLabel","متبقي على بداية الدوام");
    setText("remainingTime",formatCountdown(remainingSeconds));
    return;
  }

  if(schedule.next){
    const remainingSeconds =
      (schedule.next.startMinutes - schedule.currentMinutes) * 60;

    setText("countLabel","متبقي على الحصة القادمة");
    setText("remainingTime",formatCountdown(remainingSeconds));
    return;
  }

  setText("countLabel","انتهى اليوم الدراسي");
  setText("remainingTime","00:00");
}

function createCell(text,className){
  const cell = document.createElement("td");

  cell.textContent = text;

  if(className){
    cell.className = className;
  }

  return cell;
}

function createStatusCell(state,period){
  const cell = document.createElement("td");
  const stateText = document.createElement("span");
  const durationText = document.createElement("small");

  cell.className = "status-cell";
  stateText.className = "state-text";
  durationText.className = "duration-text";

  stateText.textContent = state;
  durationText.textContent = formatDuration(period);

  cell.append(stateText,durationText);

  return cell;
}

function createTimeCell(period){
  const cell = document.createElement("td");

  cell.className = "time-cell";
  cell.appendChild(createTimeRange(period));

  return cell;
}

function createRow(period,schedule){
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
    createStatusCell(state,period)
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
      .map(period => createRow(period,schedule));

    column1.replaceChildren(...rows);
  }

  if(column2){
    const rows = schedule.list
      .filter(period => period.col === 2)
      .map(period => createRow(period,schedule));

    column2.replaceChildren(...rows);
  }
}

let visionIndex = 0;

function updateVision(){
  if(!settings.visionMessages.length){
    return;
  }

  setText("visionText",settings.visionMessages[visionIndex]);

  visionIndex = (visionIndex + 1) % settings.visionMessages.length;
}

function createTickerGroup(){
  const group = document.createElement("div");

  group.className = "ticker-group";

  messages.forEach(message=>{
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

  ticker.replaceChildren(createTickerGroup(),createTickerGroup());
}

function init(){
  const logo = el("schoolLogo");

  if(logo){
    logo.src = settings.schoolLogo;
  }

  setText("schoolName",settings.schoolName);
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

setInterval(tick,1000);
setInterval(updateVision,5000);

/* إظهار وقت الحصة في المربعات العلوية */
.period-card{
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:flex-start !important;
}

.period-title,
.period-name,
.period-line,
.period-time{
  position:static !important;
  transform:none !important;
}

.period-title{
  margin-top:.75rem !important;
  margin-bottom:.35rem !important;
}

.period-name{
  margin-bottom:.55rem !important;
}

.period-line{
  margin-bottom:.55rem !important;
}

.period-time{
  display:block !important;
  visibility:visible !important;
  opacity:1 !important;
  font-size:clamp(18px,1.15vw,28px) !important;
  font-weight:900 !important;
  color:#5c5141 !important;
  direction:ltr !important;
  unicode-bidi:isolate !important;
  white-space:nowrap !important;
  text-align:center !important;
  z-index:5 !important;
}

/* تكبير جدول الحصص في الحاسوب */
@media (min-width:900px){

  .schedule-section{
    top:38.4% !important;
    right:2.45% !important;
    width:48.2% !important;
    height:45.4% !important;
  }

  .schedule-grid{
    gap:1.8% !important;
    padding:2.1% 2.1% 2.4% !important;
  }

  .schedule-grid table{
    border-spacing:0 9px !important;
  }

  .schedule-grid tr{
    min-height:52px !important;
    padding:.38rem .62rem !important;
    border-radius:16px !important;
  }

  .schedule-grid td:nth-child(1){
    font-size:clamp(18px,1.12vw,26px) !important;
  }

  .schedule-grid td:nth-child(2){
    font-size:clamp(17px,1.02vw,24px) !important;
  }

  .schedule-grid td:nth-child(3){
    font-size:clamp(13px,.82vw,18px) !important;
  }

  .status-cell{
    padding:.16rem .32rem !important;
  }

  .status-cell .duration-text{
    display:block !important;
    font-size:clamp(10px,.65vw,15px) !important;
    margin-top:2px !important;
  }

  .current-row{
    transform:scale(1.018) !important;
    box-shadow:
      0 0 0 4px rgba(214,163,61,.22),
      0 10px 20px rgba(0,0,0,.07) !important;
  }
}
