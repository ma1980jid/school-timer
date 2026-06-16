const settings = {
  schoolLogo: "icons/school_logo.svg",
  announcement: "الالتزام بالحضور والانصراف في الوقت المحدد",
  showPrayer: true,
  activityDay: 1
};

const periods = [
  {name:"الطابور",start:"05:00",end:"05:10",type:"normal",col:1},
  {name:"النشاط",start:"05:10",end:"05:55",type:"activity",col:1,activityOnly:true},
  {name:"الأولى",start:"05:55",end:"06:40",type:"normal",col:1},
  {name:"الثانية",start:"06:40",end:"07:25",type:"normal",col:1},
  {name:"الثالثة",start:"07:25",end:"08:10",type:"normal",col:1},
  {name:"الرابعة",start:"08:10",end:"08:55",type:"normal",col:1},

  {name:"الفسحة",start:"08:55",end:"09:15",type:"break",col:2},
  {name:"الخامسة",start:"09:15",end:"10:00",type:"normal",col:2},
  {name:"السادسة",start:"10:00",end:"10:45",type:"normal",col:2},
  {name:"السابعة",start:"10:45",end:"11:30",type:"normal",col:2},
  {name:"الصلاة",start:"11:30",end:"11:45",type:"prayer",col:2,optionalPrayer:true},
  {name:"الثامنة",start:"11:45",end:"12:30",type:"normal",col:2}
];

const messages = [
  "مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري",
  "العلم نور",
  "الانضباط طريق النجاح",
  "نسعى لبناء مستقبل تعليمي متميز"
];

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
  const [hours,minutes] = time.split(":").map(Number);
  return `${pad(hours)}:${pad(minutes)}`;
}

function getVisiblePeriods(){
  const today = new Date().getDay();

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
  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60;

  const list = getVisiblePeriods();

  const current = list.find(period =>
    currentMinutes >= toMinutes(period.start) &&
    currentMinutes < toMinutes(period.end)
  );

  const previous = [...list].reverse().find(period =>
    currentMinutes >= toMinutes(period.end)
  );

  const next = list.find(period =>
    currentMinutes < toMinutes(period.start)
  );

  return {
    now,
    currentMinutes,
    list,
    current,
    previous,
    next
  };
}

function updateCards(){
  const schedule = getSchedule();

  setText("previousName", schedule.previous ? schedule.previous.name : "--");
  setText("previousTime", schedule.previous ? `${formatTime(schedule.previous.start)} - ${formatTime(schedule.previous.end)}` : "--");

  setText("currentName", schedule.current ? schedule.current.name : "--");
  setText("currentTime", schedule.current ? `${formatTime(schedule.current.start)} - ${formatTime(schedule.current.end)}` : "--");

  setText("nextName", schedule.next ? schedule.next.name : "--");
  setText("nextTime", schedule.next ? `${formatTime(schedule.next.start)} - ${formatTime(schedule.next.end)}` : "--");
}

function updateClock(){
  const now = new Date();
  setText("digitalClock", `${pad(now.getHours())}:${pad(now.getMinutes())}`);
}

function updateDate(){
  const now = new Date();

  setText("weekday", new Intl.DateTimeFormat("ar-OM",{
    weekday:"long"
  }).format(now));

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
  }catch(error){
    setText("hijriDate","");
  }
}

function updateRemaining(){
  const schedule = getSchedule();

  if(!schedule.current){
    setText("remainingTime","--:--");
    return;
  }

  const end = toMinutes(schedule.current.end);
  const remainingSeconds = Math.max(0, Math.round((end - schedule.currentMinutes) * 60));

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  setText("remainingTime", `${pad(minutes)}:${pad(seconds)}`);
}

function rowHtml(period,schedule){
  let state = "قادمة";

  if(schedule.current && schedule.current.name === period.name){
    state = "جارية";
  }else if(schedule.currentMinutes >= toMinutes(period.end)){
    state = "انتهت";
  }

  const currentClass = state === "جارية" ? "current-row" : "";

  const typeClass =
    period.type === "break" ? "break-row" :
    period.type === "prayer" ? "prayer-row" :
    period.type === "activity" ? "activity-row" : "";

  return `
    <tr class="${currentClass} ${typeClass}">
      <td>${period.name}</td>
      <td>${formatTime(period.start)} - ${formatTime(period.end)}</td>
      <td>${state}</td>
    </tr>
  `;
}

function renderTable(){
  const schedule = getSchedule();

  const column1 = el("scheduleCol1");
  const column2 = el("scheduleCol2");

  if(column1){
    column1.innerHTML = schedule.list
      .filter(period => period.col === 1)
      .map(period => rowHtml(period,schedule))
      .join("");
  }

  if(column2){
    column2.innerHTML = schedule.list
      .filter(period => period.col === 2)
      .map(period => rowHtml(period,schedule))
      .join("");
  }
}

let messageIndex = 0;

function updateTicker(){
  setText("tickerText", messages[messageIndex]);
  messageIndex = (messageIndex + 1) % messages.length;
}

function init(){
  const logo = el("schoolLogo");

  if(logo){
    logo.src = settings.schoolLogo;
  }

  setText("schoolAnnouncement", settings.announcement);
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
updateTicker();

setInterval(tick,1000);
setInterval(updateTicker,5000);
