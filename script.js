const schoolSettings = {
  schoolName: "مدرسة الشيخ سيف بن حمد الأغبري",
  schoolLogo: "icons/school_logo.svg",
  announcement: "الالتزام بالحضور والانصراف في الوقت المحدد",
  showPrayer: true,
  activityDay: 1 // الأحد = 0، الاثنين = 1، الثلاثاء = 2 ...
};

const periods = [
  { name:"الطابور", start:"07:00", end:"07:15", type:"normal", col:1 },
  { name:"حصة النشاط", start:"07:15", end:"07:55", type:"activity", col:1, activityOnly:true },
  { name:"الحصة الأولى", start:"07:55", end:"08:35", type:"normal", col:1 },
  { name:"الحصة الثانية", start:"08:35", end:"09:15", type:"normal", col:1 },
  { name:"الحصة الثالثة", start:"09:15", end:"09:55", type:"normal", col:1 },
  { name:"الحصة الرابعة", start:"09:55", end:"10:35", type:"normal", col:1 },

  { name:"الحصة الخامسة", start:"10:35", end:"11:15", type:"normal", col:2 },
  { name:"الحصة السادسة", start:"11:15", end:"11:55", type:"normal", col:2 },
  { name:"الحصة السابعة", start:"11:55", end:"12:35", type:"normal", col:2 },
  { name:"الصلاة", start:"12:35", end:"12:50", type:"prayer", col:2, optionalPrayer:true },
  { name:"الحصة الثامنة", start:"12:50", end:"13:30", type:"normal", col:2 },
  { name:"الفسحة", start:"13:30", end:"13:50", type:"break", col:2 }
];

const messages = [
  "العلم نور",
  "الانضباط طريق النجاح",
  "نسعى لبناء مستقبل تعليمي متميز",
  "مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري"
];

function el(id){
  return document.getElementById(id);
}

function setText(id,value){
  const e = el(id);
  if(e) e.textContent = value;
}

function pad(n){
  return String(n).padStart(2,"0");
}

function toMinutes(time){
  const [h,m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(time){
  let [h,m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m)} ${suffix}`;
}

function getVisiblePeriods(){
  const today = new Date().getDay();

  return periods.filter(p=>{
    if(p.optionalPrayer && !schoolSettings.showPrayer) return false;
    if(p.activityOnly && today !== schoolSettings.activityDay) return false;
    return true;
  });
}

function getSchedule(){
  const now = new Date();
  const currentMinutes = now.getHours()*60 + now.getMinutes() + now.getSeconds()/60;
  const list = getVisiblePeriods();

  const current = list.find(p=>currentMinutes >= toMinutes(p.start) && currentMinutes < toMinutes(p.end));
  const previous = [...list].reverse().find(p=>currentMinutes >= toMinutes(p.end));
  const next = list.find(p=>currentMinutes < toMinutes(p.start));

  return { now, currentMinutes, list, current, previous, next };
}

function updateHeader(){
  setText("schoolName", schoolSettings.schoolName);

  const img = el("schoolLogo");
  if(img) img.src = schoolSettings.schoolLogo;

  setText("schoolAnnouncement", schoolSettings.announcement);
}

function updateCards(){
  const s = getSchedule();

  setText("previousName", s.previous ? s.previous.name : "--");
  setText("previousTime", s.previous ? `${formatTime(s.previous.start)} - ${formatTime(s.previous.end)}` : "--");

  setText("currentName", s.current ? s.current.name : "--");
  setText("currentTime", s.current ? `${formatTime(s.current.start)} - ${formatTime(s.current.end)}` : "--");

  setText("nextName", s.next ? s.next.name : "--");
  setText("nextTime", s.next ? `${formatTime(s.next.start)} - ${formatTime(s.next.end)}` : "--");
}

function updateClock(){
  const now = new Date();
  setText("digitalClock", `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
}

function updateDate(){
  const now = new Date();

  setText("weekday", new Intl.DateTimeFormat("ar-OM",{weekday:"long"}).format(now));

  setText("gregorianDate", new Intl.DateTimeFormat("ar-OM",{
    day:"numeric",
    month:"long",
    year:"numeric"
  }).format(now));

  try{
    setText("hijriDate", new Intl.DateTimeFormat("ar-OM-u-ca-islamic",{
      day:"numeric",
      month:"long",
      year:"numeric"
    }).format(now));
  }catch(e){
    setText("hijriDate","");
  }
}

function updateCountdown(){
  const s = getSchedule();
  const fill = el("progressFill");

  if(!s.current){
    setText("remainingTime","--:--");
    setText("progressPercent","0%");
    if(fill) fill.style.width = "0%";
    return;
  }

  const start = toMinutes(s.current.start);
  const end = toMinutes(s.current.end);
  const remaining = Math.max(0, Math.round((end - s.currentMinutes) * 60));

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  setText("remainingTime", `${pad(mm)}:${pad(ss)}`);

  let progress = ((s.currentMinutes - start) / (end - start)) * 100;
  progress = Math.max(0, Math.min(progress,100));

  setText("progressPercent", Math.round(progress) + "%");
  if(fill) fill.style.width = progress + "%";
}

function rowHtml(p,s){
  let state = "قادمة";

  if(s.current && s.current.name === p.name) state = "جارية";
  else if(s.currentMinutes >= toMinutes(p.end)) state = "انتهت";

  const currentClass = state === "جارية" ? "current-row" : "";
  const typeClass =
    p.type === "break" ? "break-row" :
    p.type === "prayer" ? "prayer-row" :
    p.type === "activity" ? "activity-row" : "";

  return `
    <tr class="${currentClass} ${typeClass}">
      <td>${p.name}</td>
      <td>${formatTime(p.start)} - ${formatTime(p.end)}</td>
      <td>${state}</td>
    </tr>
  `;
}

function renderSchedule(){
  const s = getSchedule();
  const col1 = el("scheduleCol1");
  const col2 = el("scheduleCol2");

  const list1 = s.list.filter(p=>p.col === 1);
  const list2 = s.list.filter(p=>p.col === 2);

  if(col1) col1.innerHTML = list1.map(p=>rowHtml(p,s)).join("");
  if(col2) col2.innerHTML = list2.map(p=>rowHtml(p,s)).join("");
}

let msgIndex = 0;

function updateTicker(){
  setText("tickerText", messages[msgIndex]);
  msgIndex = (msgIndex + 1) % messages.length;
}

function tick(){
  updateClock();
  updateDate();
  updateCards();
  updateCountdown();
  renderSchedule();
}

updateHeader();
tick();
updateTicker();

setInterval(tick,1000);
setInterval(updateTicker,5000);
