const periods = [
 const periods = [
  ["الطابور","07:00","07:15","normal"],
  ["الحصة الأولى","07:15","07:55","normal"],
  ["الحصة الثانية","07:55","08:35","normal"],
  ["الحصة الثالثة","08:35","09:15","normal"],
  ["الحصة الرابعة","09:15","09:55","normal"],
  ["الحصة الخامسة","09:55","10:35","normal"],
  ["الفسحة","10:35","10:55","break"],
  ["الحصة السادسة","10:55","11:35","normal"],
  ["الحصة السابعة","11:35","12:15","normal"],
  ["الحصة الثامنة","12:15","12:55","normal"],
  ["الصلاة","12:55","13:10","prayer"],
  ["النشاط","13:10","13:50","activity"]
];
].map((item,index)=>({
  index:index+1,
  name:item[0],
  start:item[1],
  end:item[2]
}));

const messages = [
  "نسعى لبناء مستقبل تعليمي متميز",
  "العلم نور",
  "الانضباط طريق النجاح",
  "أهلاً بكم في مدرسة الشيخ سيف بن حمد الأغبري"
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
  const p = time.split(":").map(Number);
  return p[0]*60+p[1];
}

function formatTime(time){
  let [h,m] = time.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return pad(h)+":"+pad(m)+" "+period;
}

function getSchedule(now){
  const currentMinutes =
    now.getHours()*60 +
    now.getMinutes() +
    now.getSeconds()/60;

  const current = periods.find(p =>
    currentMinutes >= toMinutes(p.start) &&
    currentMinutes < toMinutes(p.end)
  );

  const ended = periods.slice().reverse().find(p =>
    currentMinutes >= toMinutes(p.end)
  );

  const next = periods.find(p =>
    currentMinutes < toMinutes(p.start)
  );

  return {current,ended,next,currentMinutes};
}

function updateCards(now){
  const s = getSchedule(now);

  setText("currentTitle", s.current ? s.current.name : "--");
  setText("currentTime", s.current ? `${formatTime(s.current.start)} - ${formatTime(s.current.end)}` : "--");

  setText("endedTitle", s.ended ? s.ended.name : "--");
  setText("endedTime", s.ended ? `${formatTime(s.ended.start)} - ${formatTime(s.ended.end)}` : "--");

  setText("nextTitle", s.next ? s.next.name : "--");
  setText("nextTime", s.next ? `${formatTime(s.next.start)} - ${formatTime(s.next.end)}` : "--");
}

function updateClock(now){
  setText("digitalTime", `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);

  const secondHand = el("secondHand");
  const minuteHand = el("minuteHand");
  const hourHand = el("hourHand");

  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds/60;
  const hours = (now.getHours()%12) + minutes/60;

  if(secondHand) secondHand.style.transform = `translateX(-50%) rotate(${seconds*6}deg)`;
  if(minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${minutes*6}deg)`;
  if(hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hours*30}deg)`;
}

function updateCountdown(now){
  const s = getSchedule(now);
  const fill = el("progressFill");

  if(!s.current){
    setText("countdownLabel","لا توجد حصة حالية");
    setText("countdownValue","--:--");
    setText("progressPercent","%0");
    if(fill) fill.style.width = "0%";
    return;
  }

  const start = toMinutes(s.current.start);
  const end = toMinutes(s.current.end);
  const remaining = Math.max(0, Math.round((end - s.currentMinutes)*60));

  const mm = Math.floor(remaining/60);
  const ss = remaining % 60;

  setText("countdownLabel","متبقي من الحصة الحالية");
  setText("countdownValue",`${pad(mm)}:${pad(ss)}`);

  let progress = ((s.currentMinutes - start) / (end - start)) * 100;
  progress = Math.max(0, Math.min(progress,100));

  setText("progressPercent", Math.round(progress)+"%");
  if(fill) fill.style.width = progress+"%";
}

function updateDate(now){
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
  }catch(e){}
}

function renderSchedule(){
  const body = el("scheduleBody");
  if(!body) return;

  const s = getSchedule(new Date());

  body.innerHTML = periods.map(period=>{
    let state = "قادمة";

    if(s.current && period.index === s.current.index){
      state = "جارية";
    }else if(s.currentMinutes >= toMinutes(period.end)){
      state = "انتهت";
    }

    const rowClass =
      s.current && period.index === s.current.index
      ? "current-row"
      : "";

    return `
      <tr class="${rowClass}">
        <td>${period.index}</td>
        <td>${period.name}</td>
        <td>${formatTime(period.start)} - ${formatTime(period.end)}</td>
        <td>${state}</td>
      </tr>
    `;
  }).join("");
}

let msgIndex = 0;

function updateTicker(){
  const ticker = el("tickerTrack");
  if(!ticker) return;

  ticker.textContent = messages[msgIndex];
  msgIndex = (msgIndex + 1) % messages.length;
}

function tick(){
  const now = new Date();

  updateClock(now);
  updateCards(now);
  updateCountdown(now);
  updateDate(now);
  renderSchedule();
}

tick();
updateTicker();

setInterval(tick,1000);
setInterval(updateTicker,5000);
