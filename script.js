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

const dayMap = {
  Sun:0,
  Mon:1,
  Tue:2,
  Wed:3,
  Thu:4,
  Fri:5,
  Sat:6
};

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
  if(element) element.textContent = value;
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

function getOmanTimeParts(date = new Date()){
  const parts = new Intl.DateTimeFormat("en-GB",{
    timeZone: settings.timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
