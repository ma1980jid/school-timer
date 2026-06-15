const settings = {
  schoolLogo: "icons/school_logo.svg",
  announcement: "الالتزام بالحضور والانصراف في الوقت المحدد",
  showPrayer: true,
  activityDay: 1
};

const periods = [
  {name:"الطابور",start:"07:00",end:"07:15",type:"normal",col:1},
  {name:"حصة النشاط",start:"07:15",end:"07:55",type:"activity",col:1,activityOnly:true},
  {name:"الحصة الأولى",start:"07:55",end:"08:35",type:"normal",col:1},
  {name:"الحصة الثانية",start:"08:35",end:"09:15",type:"normal",col:1},
  {name:"الحصة الثالثة",start:"09:15",end:"09:55",type:"normal",col:1},
  {name:"الحصة الرابعة",start:"09:55",end:"10:35",type:"normal",col:1},

  {name:"الفسحة",start:"10:35",end:"10:55",type:"break",col:2},
  {name:"الحصة الخامسة",start:"10:55",end:"11:35",type:"normal",col:2},
  {name:"الحصة السادسة",start:"11:35",end:"12:15",type:"normal",col:2},
  {name:"الحصة السابعة",start:"12:15",end:"12:55",type:"normal",col:2},
  {name:"الصلاة",start:"12:55",end:"13:10",type:"prayer",col:2,optionalPrayer:true},
  {name:"الحصة الثامنة",start:"13:10",end:"13:50",type:"normal",col:2}
];

const messages=[
  "مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري",
  "العلم نور",
  "الانضباط طريق النجاح",
  "نسعى لبناء مستقبل تعليمي متميز"
];

function el(id){return document.getElementById(id)}
function setText(id,v){const e=el(id);if(e)e.textContent=v}
function pad(n){return String(n).padStart(2,"0")}

function toMinutes(t){
  const [h,m]=t.split(":").map(Number);
  return h*60+m;
}

function formatTime(t){
  let [h,m]=t.split(":").map(Number);
  const s=h>=12?"م":"ص";
  h=h%12||12;
  return `${pad(h)}:${pad(m)} ${s}`;
}

function visiblePeriods(){
  const today=new Date().getDay();
  return periods.filter(p=>{
    if(p.optionalPrayer && !settings.showPrayer)return false;
    if(p.activityOnly && today!==settings.activityDay)return false;
    return true;
  });
}

function schedule(){
  const now=new Date();
  const mins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const list=visiblePeriods();
  const current=list.find(p=>mins>=toMinutes(p.start)&&mins<toMinutes(p.end));
  const previous=[...list].reverse().find(p=>mins>=toMinutes(p.end));
  const next=list.find(p=>mins<toMinutes(p.start));
  return{now,mins,list,current,previous,next};
}

function updateCards(){
  const s=schedule();

  setText("previousName",s.previous?s.previous.name:"--");
  setText("previousTime",s.previous?`${formatTime(s.previous.start)} - ${formatTime(s.previous.end)}`:"--");

  setText("currentName",s.current?s.current.name:"--");
  setText("currentTime",s.current?`${formatTime(s.current.start)} - ${formatTime(s.current.end)}`:"--");

  setText("nextName",s.next?s.next.name:"--");
  setText("nextTime",s.next?`${formatTime(s.next.start)} - ${formatTime(s.next.end)}`:"--");
}

function updateClock(){
  const n=new Date();
  setText("digitalClock",`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`);
}

function updateDate(){
  const n=new Date();

  setText("weekday",new Intl.DateTimeFormat("ar-OM",{weekday:"long"}).format(n));

  setText("gregorianDate",new Intl.DateTimeFormat("ar-OM",{
    day:"numeric",month:"long",year:"numeric"
  }).format(n));

  try{
    setText("hijriDate",new Intl.DateTimeFormat("ar-OM-u-ca-islamic",{
      day:"numeric",month:"long",year:"numeric"
    }).format(n));
  }catch(e){
    setText("hijriDate","");
  }
}

function updateRemaining(){
  const s=schedule();

  if(!s.current){
    setText("remainingTime","--:--");
    return;
  }

  const end=toMinutes(s.current.end);
  const remain=Math.max(0,Math.round((end-s.mins)*60));
  const mm=Math.floor(remain/60);
  const ss=remain%60;

  setText("remainingTime",`${pad(mm)}:${pad(ss)}`);
}

function row(p,s){
  let state="قادمة";
  if(s.current&&s.current.name===p.name)state="جارية";
  else if(s.mins>=toMinutes(p.end))state="انتهت";

  const c=state==="جارية"?"current-row":"";
  const t=p.type==="break"?"break-row":p.type==="prayer"?"prayer-row":p.type==="activity"?"activity-row":"";

  return `<tr class="${c} ${t}">
    <td>${p.name}</td>
    <td>${formatTime(p.start)} - ${formatTime(p.end)}</td>
    <td>${state}</td>
  </tr>`;
}

function renderTable(){
  const s=schedule();
  const c1=el("scheduleCol1");
  const c2=el("scheduleCol2");

  if(c1)c1.innerHTML=s.list.filter(p=>p.col===1).map(p=>row(p,s)).join("");
  if(c2)c2.innerHTML=s.list.filter(p=>p.col===2).map(p=>row(p,s)).join("");
}

let msg=0;
function ticker(){
  setText("tickerText",messages[msg]);
  msg=(msg+1)%messages.length;
}

function init(){
  const logo=el("schoolLogo");
  if(logo)logo.src=settings.schoolLogo;
  setText("schoolAnnouncement",settings.announcement);
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
ticker();

setInterval(tick,1000);
setInterval(ticker,5000);
