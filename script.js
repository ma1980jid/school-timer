//========================
// الحصص
//========================

const periods = [
  ["الحصة الأولى","07:15","07:55"],
  ["الحصة الثانية","07:55","08:35"],
  ["الحصة الثالثة","08:35","09:15"],
  ["الحصة الرابعة","09:15","09:35"],
  ["الحصة الخامسة","09:35","10:15"],
  ["الحصة السادسة","10:15","10:55"],
  ["الفسحة","10:55","11:35"],
  ["الحصة السابعة","11:35","12:15"]
].map((item,index)=>({
  index:index+1,
  name:item[0],
  start:item[1],
  end:item[2]
}));


//========================
// الرسائل
//========================

const messages = [
"نسعى لبناء مستقبل تعليمي متميز",
"العلم نور",
"الانضباط طريق النجاح",
"معاً نحو التميز",
"أهلاً بكم في مدرسة الشيخ سيف بن حمد الأغبري"
];


//========================
// أدوات مساعدة
//========================

function el(id){
  return document.getElementById(id);
}

function pad(n){
  return String(n).padStart(2,"0");
}

function toMinutes(time){

  let p=time.split(":").map(Number);

  return p[0]*60+p[1];
}

function formatTime(time){

  let p=time.split(":").map(Number);

  let h=p[0];
  let m=p[1];

  let period=h>=12 ? "م" : "ص";

  h=h%12 || 12;

  return pad(h)+":"+pad(m)+" "+period;
}


//========================
// تحديد الحصة الحالية
//========================

function getSchedule(now){

  let currentMinutes =
  now.getHours()*60 +
  now.getMinutes() +
  now.getSeconds()/60;

  let current=
  periods.find(
    p =>
      currentMinutes>=toMinutes(p.start)
      &&
      currentMinutes<toMinutes(p.end)
  );

  let ended=
  periods
  .slice()
  .reverse()
  .find(
    p =>
      currentMinutes>=toMinutes(p.end)
  );

  let next=
  periods.find(
    p =>
      currentMinutes<toMinutes(p.start)
  );

  return{
    current,
    ended,
    next,
    currentMinutes
  };

}



//========================
// البطاقات الثلاث
//========================

function updateCards(now){

  let schedule=getSchedule(now);

  let current=schedule.current;
  let ended=schedule.ended;
  let next=schedule.next;

  el("currentTitle").textContent=
  current ? current.name : "--";

  el("currentTime").textContent=
  current ?
  formatTime(current.start)+" - "+formatTime(current.end)
  :
  "--";



  el("endedTitle").textContent=
  ended ? ended.name : "--";

  el("endedTime").textContent=
  ended ?
  formatTime(ended.start)+" - "+formatTime(ended.end)
  :
  "--";



  el("nextTitle").textContent=
  next ? next.name : "--";

  el("nextTime").textContent=
  next ?
  formatTime(next.start)+" - "+formatTime(next.end)
  :
  "--";

}



//========================
// الساعة الرقمية
//========================

function updateDigitalClock(now){

  let h=pad(now.getHours());
  let m=pad(now.getMinutes());
  let s=pad(now.getSeconds());

  el("digitalTime").textContent=
  h+":"+m+":"+s;

}



//========================
// الساعة التناظرية
//========================

function updateAnalogClock(now){

  let seconds=now.getSeconds();

  let minutes=
  now.getMinutes()+seconds/60;

  let hours=
  (now.getHours()%12)+minutes/60;


  el("secondHand").style.transform=
  "translateX(-50%) rotate("+seconds*6+"deg)";


  el("minuteHand").style.transform=
  "translateX(-50%) rotate("+minutes*6+"deg)";


  el("hourHand").style.transform=
  "translateX(-50%) rotate("+hours*30+"deg)";

}



//========================
// العد التنازلي
//========================

function updateCountdown(now){

  let schedule=getSchedule(now);

  let current=schedule.current;

  if(!current){

    el("countdownValue").textContent="--:--";
    return;

  }

  let end=
  toMinutes(current.end);

  let currentMin=
  schedule.currentMinutes;

  let remaining=
  Math.round(
    (end-currentMin)*60
  );

  let mm=
  Math.floor(remaining/60);

  let ss=
  remaining%60;

  el("countdownValue").textContent=
  pad(mm)+":"+pad(ss);


  let start=
  toMinutes(current.start);

  let progress=
  ((currentMin-start)/(end-start))*100;

  progress=Math.max(
    0,
    Math.min(progress,100)
  );

  el("progressPercent").textContent=
  Math.round(progress)+"%";

  el("progressFill").style.width=
  progress+"%";

}



//========================
// التاريخ
//========================

function updateDate(now){

  el("weekday").textContent=
  new Intl.DateTimeFormat(
    "ar-OM",
    {weekday:"long"}
  ).format(now);



  el("gregorianDate").textContent=
  new Intl.DateTimeFormat(
    "ar-OM",
    {
      day:"numeric",
      month:"long",
      year:"numeric"
    }
  ).format(now);



  el("hijriDate").textContent=
  new Intl.DateTimeFormat(
    "ar-OM-u-ca-islamic",
    {
      day:"numeric",
      month:"long",
      year:"numeric"
    }
  ).format(now);

}



//========================
// جدول الحصص
//========================

function renderSchedule(){

  let schedule=getSchedule(new Date());

  let html="";

  periods.forEach(period=>{

    let state="قادمة";

    if(
      schedule.current &&
      period.index===schedule.current.index
    ){

      state="جارية";

    }

    else if(
      schedule.currentMinutes>=
      toMinutes(period.end)
    ){

      state="انتهت";

    }


    let rowClass=
    (
      schedule.current &&
      period.index===schedule.current.index
    )
    ?
    "current-row"
    :
    "";


    html+=`
    <tr class="${rowClass}">
      <td>${period.index}</td>
      <td>${period.name}</td>
      <td>${formatTime(period.start)} - ${formatTime(period.end)}</td>
      <td>${state}</td>
    </tr>
    `;

  });


  el("scheduleBody").innerHTML=
  html;

}



//========================
// شريط الرسائل
//========================

let msgIndex=0;

function updateTicker(){

  el("tickerTrack").textContent=
  messages[msgIndex];

  msgIndex++;

  if(msgIndex>=messages.length){

    msgIndex=0;

  }

}

setInterval(
  updateTicker,
  5000
);


//========================
// التشغيل
//========================

function tick(){

  let now=new Date();

  updateDigitalClock(now);

  updateAnalogClock(now);

  updateCards(now);

  updateCountdown(now);

  updateDate(now);

  renderSchedule();

}


tick();

setInterval(
  tick,
  1000
);

updateTicker();
