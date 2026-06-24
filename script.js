const settings = {
  schoolName: "مدرسة الشيخ سيف بن حمد الأغبري",
  schoolLogo: "icons/school_logo.png",
  timeZone: "Asia/Muscat",
  activeSchedule: "oneShift_scheduleFirst",
  activityDay: 6,
  activityPosition: "afterAssembly",
  activityEnabled: false,
  designTheme: "omani",
  visionMessages: ["رؤيتنا: تعليم ملهم لمستقبل مشرق", "رسالتنا: بيئة مدرسية آمنة ومحفزة للتعلم", "قيمنا: الانضباط، الإبداع، المسؤولية"]
};

function applyUrlSettings() {
  const p = new URLSearchParams(location.search);
  if (p.get("schedule")) settings.activeSchedule = p.get("schedule");
  if (p.get("activityDay") !== null && p.get("activityDay") !== "") settings.activityDay = Number(p.get("activityDay"));
  if (p.get("activityPosition")) settings.activityPosition = p.get("activityPosition");
  if (p.get("activityEnabled") !== null) settings.activityEnabled = p.get("activityEnabled") === "1";
  if (p.get("theme")) settings.designTheme = p.get("theme");
}
applyUrlSettings();
document.documentElement.setAttribute("data-theme", settings.designTheme);

const rawSchedules = {
  oneShift_scheduleFirst: [["الطابور","07:00","07:15"],["الأولى","07:15","07:55"],["الثانية","08:00","08:40"],["الثالثة","08:45","09:25"],["الرابعة","09:30","10:10"],["الفسحة","10:10","10:35"],["الخامسة","10:35","11:15"],["السادسة","11:20","12:00"],["السابعة","12:05","12:45"],["الثامنة","12:50","13:30"]],
  oneShift_scheduleFirstPrayer: [["الطابور","07:00","07:15"],["الأولى","07:15","07:55"],["الثانية","07:55","08:35"],["الثالثة","08:35","09:15"],["الرابعة","09:15","09:55"],["الفسحة","09:55","10:20"],["الخامسة","10:20","11:00"],["السادسة","11:00","11:40"],["السابعة","11:40","12:20"],["الصلاة","12:20","12:45"],["الثامنة","12:45","13:30"]],
  oneShift_scheduleSecond: [["الطابور","07:10","07:25"],["الأولى","07:25","08:05"],["الثانية","08:10","08:50"],["الثالثة","08:55","09:35"],["الرابعة","09:40","10:20"],["الفسحة","10:20","10:45"],["الخامسة","10:45","11:25"],["السادسة","11:30","12:10"],["السابعة","12:15","12:55"],["الثامنة","13:00","13:40"]],
  oneShift_scheduleSecondPrayer: [["الطابور","07:10","07:25"],["الأولى","07:25","08:05"],["الثانية","08:05","08:45"],["الثالثة","08:45","09:25"],["الرابعة","09:25","10:05"],["الفسحة","10:05","10:30"],["الخامسة","10:35","11:15"],["السادسة","11:15","11:55"],["السابعة","11:55","12:35"],["الصلاة","12:35","13:00"],["الثامنة","13:00","13:40"]],
  oneShift_ramadan: [["الطابور","07:10","07:20"],["الأولى","07:20","07:55"],["الثانية","07:55","08:30"],["الثالثة","08:30","09:05"],["الرابعة","09:05","09:40"],["الفسحة","09:40","09:50"],["الخامسة","09:50","10:25"],["السادسة","10:25","11:00"],["السابعة","11:00","11:35"],["الثامنة","11:35","12:10"]],
  twoMorning_scheduleFirst: [["الطابور","07:00","07:10"],["الأولى","07:10","07:45"],["الثانية","07:50","08:25"],["الثالثة","08:30","09:05"],["الرابعة","09:10","09:45"],["الفسحة","09:45","10:05"],["الخامسة","10:05","10:40"],["السادسة","10:45","11:20"],["السابعة","11:25","12:00"]],
  twoMorning_ramadan: [["الطابور","07:10","07:20"],["الأولى","07:20","07:55"],["الثانية","07:55","08:30"],["الثالثة","08:30","09:05"],["الرابعة","09:05","09:40"],["الفسحة","09:40","09:50"],["الخامسة","09:50","10:25"],["السادسة","10:25","11:00"],["السابعة","11:00","11:35"]],
  twoEvening_scheduleFirst: [["الطابور","12:10","12:20"],["الأولى","12:20","12:55"],["الثانية","12:55","13:30"],["الثالثة","13:30","14:05"],["الرابعة","14:05","14:40"],["الفسحة","14:40","15:00"],["الخامسة","15:00","15:35"],["السادسة","15:35","16:10"],["السابعة","16:10","16:45"]],
  twoEvening_scheduleFirstPrayer: [["الطابور","12:10","12:20"],["الأولى","12:20","12:55"],["صلاة الظهر","12:55","13:10"],["الثانية","13:10","13:40"],["الثالثة","13:40","14:10"],["الرابعة","14:10","14:40"],["الفسحة","14:40","15:00"],["الخامسة","15:00","15:30"],["السادسة","15:30","16:00"],["صلاة العصر","16:00","16:15"],["السابعة","16:15","16:45"]],
  twoEvening_ramadan: [["الطابور","11:40","11:45"],["الأولى","11:45","12:20"],["الثانية","12:20","12:55"],["الثالثة","12:55","13:30"],["الرابعة","13:30","14:05"],["الفسحة","14:05","14:15"],["الخامسة","14:15","14:50"],["السادسة","14:50","15:25"],["السابعة","15:25","16:00"]]
};
rawSchedules.oneShift_exam = rawSchedules.oneShift_scheduleFirst;
rawSchedules.twoMorning_exam = rawSchedules.twoMorning_scheduleFirst;
rawSchedules.twoMorning_scheduleSecond = rawSchedules.twoMorning_scheduleFirst;
rawSchedules.twoEvening_exam = rawSchedules.twoEvening_scheduleFirst;
rawSchedules.twoEvening_scheduleSecond = rawSchedules.twoEvening_scheduleFirst;
rawSchedules.twoEvening_scheduleSecondPrayer = rawSchedules.twoEvening_scheduleFirstPrayer;

const classNames = new Set(["الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة"]);
const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
const messages = ["مرحبًا بكم في مدرسة الشيخ سيف بن حمد الأغبري", "العلم نور", "الانضباط طريق النجاح", "نسعى لبناء مستقبل تعليمي متميز"];

function schoolKind(key = settings.activeSchedule) { return key.split("_")[0]; }
function isRamadan(key = settings.activeSchedule) { return key.includes("ramadan"); }
function isPrayer(key = settings.activeSchedule) { return key.includes("Prayer"); }
function activityAllowed(key = settings.activeSchedule) { const k = schoolKind(key); return !isRamadan(key) && key.includes("schedule") && !(k === "twoEvening" && isPrayer(key)); }
function activityRules(kind) { if (kind === "oneShift") return { activity: 40, breakDur: 20 }; if (kind === "twoEvening") return { activity: 30, breakDur: 15 }; return { activity: 30, breakDur: 20 }; }
function typeOf(name) { if (name.includes("فسحة")) return "break"; if (name.includes("صلاة") || name === "الصلاة") return "prayer"; if (name.includes("نشاط")) return "activity"; return "normal"; }
function el(id) { return document.getElementById(id); }
function setText(id, v) { const e = el(id); if (e) e.textContent = v; }
function pad(n) { return String(n).padStart(2, "0"); }
function toMinutes(t) { const [h,m] = t.split(":").map(Number); return h * 60 + m; }
function minutesToTime(m) { m = (m % 1440 + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
function rowDuration(row) { let s = toMinutes(row[1]), e = toMinutes(row[2]); if (e <= s) e += 1440; return e - s; }
function formatTime(t) { if (!t || typeof t !== "string") return "--"; const [h,m] = t.split(":").map(Number); return `${pad(h)}:${pad(m)}`; }
function periodRange(p) { return p ? `${formatTime(p.end)} - ${formatTime(p.start)}` : "--"; }
function setTimeRange(id, p) { const e = el(id); if (!e) return; e.textContent = periodRange(p); e.setAttribute("dir", "ltr"); }

function buildActivityRows(rows, position, kind) {
  const rule = activityRules(kind);
  const startDay = toMinutes(rows[0][1]);
  const finalEnd = toMinutes(rows.at(-1)[2]) <= startDay ? toMinutes(rows.at(-1)[2]) + 1440 : toMinutes(rows.at(-1)[2]);
  const totalSpan = finalEnd - startDay;
  const expanded = [];
  rows.forEach((row, i) => {
    const next = rows[i + 1];
    const seg = { name: row[0], type: typeOf(row[0]), dur: typeOf(row[0]) === "break" ? rule.breakDur : rowDuration(row), gap: next ? Math.max(0, toMinutes(next[1]) - toMinutes(row[2])) : 0 };
    expanded.push(seg);
    if (position === "afterAssembly" && row[0] === "الطابور") { expanded.at(-1).gap = 0; expanded.push({ name:"النشاط", type:"activity", dur:rule.activity, gap:seg.gap }); }
    if (position === "afterBreak" && typeOf(row[0]) === "break") { expanded.at(-1).gap = 0; expanded.push({ name:"النشاط", type:"activity", dur:rule.activity, gap:seg.gap }); }
  });
  const fixed = expanded.filter(x => !classNames.has(x.name)).reduce((a, x) => a + x.dur, 0);
  const gaps = expanded.reduce((a, x) => a + x.gap, 0);
  const classes = expanded.filter(x => classNames.has(x.name));
  const classTotal = Math.max(0, totalSpan - fixed - gaps);
  const base = Math.floor(classTotal / classes.length);
  const rem = classTotal - base * classes.length;
  let c = 0;
  expanded.forEach(x => { if (classNames.has(x.name)) { x.dur = base + (c < rem ? 1 : 0); c++; } });
  let t = startDay;
  return expanded.map(x => { const s = t, e = t + x.dur; t = e + x.gap; return [x.name, minutesToTime(s), minutesToTime(e)]; });
}
function getOmanDay(d = new Date()) { const n = new Intl.DateTimeFormat("en-US", { timeZone: settings.timeZone, weekday: "short" }).format(d); return dayMap[n] ?? new Date().getDay(); }
function shouldUseActivity() { return settings.activityEnabled && activityAllowed() && getOmanDay() === settings.activityDay; }
function getRowsForActiveSchedule() { const rows = rawSchedules[settings.activeSchedule] || rawSchedules.oneShift_scheduleFirst; return shouldUseActivity() ? buildActivityRows(rows, settings.activityPosition, schoolKind()) : rows; }
function toPeriods(rows) { const cut = Math.ceil(rows.length / 2); return rows.map((r, i) => ({ name:r[0], start:r[1], end:r[2], type:typeOf(r[0]), col:i < cut ? 1 : 2 })); }
function getActivePeriods() { return toPeriods(getRowsForActiveSchedule()); }

function updateViewportHeight(){ const v = window.visualViewport; document.documentElement.style.setProperty("--app-height", `${v ? v.height : innerHeight}px`); }
updateViewportHeight(); addEventListener("resize", updateViewportHeight, {passive:true}); addEventListener("orientationchange", () => setTimeout(updateViewportHeight,250), {passive:true});
if (window.visualViewport) { visualViewport.addEventListener("resize", updateViewportHeight, {passive:true}); visualViewport.addEventListener("scroll", updateViewportHeight, {passive:true}); }
function normalizePeriod(p, base) { let s = toMinutes(p.start), e = toMinutes(p.end); if (s < base) s += 1440; if (e <= s) e += 1440; return { ...p, startMinutes:s, endMinutes:e }; }
function getOmanTimeParts(d = new Date()) { const parts = new Intl.DateTimeFormat("en-GB", { timeZone:settings.timeZone, hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit" }).formatToParts(d), v = {}; parts.forEach(x => { if (x.type !== "literal") v[x.type] = x.value; }); let h = Number(v.hour); if (h === 24) h = 0; return { hour:h, minute:Number(v.minute), second:Number(v.second) }; }
function getSchedule() { const now = new Date(), time = getOmanTimeParts(now), raw = time.hour*60 + time.minute + time.second/60, visible = getActivePeriods(), firstVisible = visible[0] || null; if (!firstVisible) return {now,time,currentMinutes:raw,list:[],first:null,last:null,current:null,previous:null,next:null,beforeSchool:false,afterSchool:false}; const base = toMinutes(firstVisible.start), list = visible.map(p => normalizePeriod(p, base)), ordered = [...list].sort((a,b)=>a.startMinutes-b.startMinutes), first = ordered[0], last = ordered.at(-1); let currentMinutes = raw; const crosses = last.endMinutes >= 1440, lastAfter = last.endMinutes - 1440; if (crosses && raw <= lastAfter) currentMinutes += 1440; const current = ordered.find(p => currentMinutes >= p.startMinutes && currentMinutes < p.endMinutes) || null, previous = [...ordered].reverse().find(p => currentMinutes >= p.endMinutes) || null, next = ordered.find(p => currentMinutes < p.startMinutes) || null; return {now,time,currentMinutes,list,first,last,current,previous,next,beforeSchool:currentMinutes<first.startMinutes,afterSchool:currentMinutes>=last.endMinutes}; }

function updateCards(){ const s=getSchedule(); setText("previousName", s.previous ? s.previous.name : "--"); setTimeRange("previousTime", s.previous); if (s.current) { setText("currentName", s.current.name); setTimeRange("currentTime", s.current); } else if (s.beforeSchool) { setText("currentName", "لم يبدأ الدوام"); setTimeRange("currentTime", s.first); } else if (s.afterSchool) { setText("currentName", "انتهى الدوام"); setTimeRange("currentTime", null); } else { setText("currentName", "لا توجد حصة"); setTimeRange("currentTime", null); } setText("nextName", s.next ? s.next.name : "--"); setTimeRange("nextTime", s.next); }
function updateClock(){ const t=getOmanTimeParts(); setText("digitalClock", `${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`); }
function updateDate(){ const now=new Date(); setText("weekday", new Intl.DateTimeFormat("ar-OM",{timeZone:settings.timeZone,weekday:"long"}).format(now)); setText("gregorianDate", new Intl.DateTimeFormat("ar-OM",{timeZone:settings.timeZone,day:"numeric",month:"long",year:"numeric"}).format(now)); try { setText("hijriDate", new Intl.DateTimeFormat("ar-OM-u-ca-islamic",{timeZone:settings.timeZone,day:"numeric",month:"long",year:"numeric"}).format(now)); } catch(e) { setText("hijriDate", ""); } }
function formatCountdown(total){ const sec=Math.max(0,Math.floor(total)), h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=sec%60; return h>0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; }
function updateRemaining(){ const s=getSchedule(); if(s.current){ setText("countLabel","متبقي من الحصة الحالية"); setText("remainingTime",formatCountdown((s.current.endMinutes-s.currentMinutes)*60)); return; } if(s.beforeSchool&&s.first){ setText("countLabel","متبقي على بداية الدوام"); setText("remainingTime",formatCountdown((s.first.startMinutes-s.currentMinutes)*60)); return; } if(s.next){ setText("countLabel","متبقي على الحصة القادمة"); setText("remainingTime",formatCountdown((s.next.startMinutes-s.currentMinutes)*60)); return; } setText("countLabel","انتهى اليوم الدراسي"); setText("remainingTime","00:00"); }
function createCell(text, cls){ const c=document.createElement("td"); c.textContent=text; if(cls)c.className=cls; return c; }
function createStatusCell(state){ const c=document.createElement("td"); c.className="status-cell"; const a=document.createElement("span"); a.className="state-text"; a.textContent=state; c.append(a); return c; }
function createTimeCell(p){ const c=document.createElement("td"); c.className="time-cell"; c.textContent=periodRange(p); c.setAttribute("dir","ltr"); return c; }
function createRow(p,s){ let state="قادمة"; if(s.current===p)state="جارية"; else if(s.currentMinutes>=p.endMinutes)state="انتهت"; const r=document.createElement("tr"); if(state==="جارية")r.classList.add("current-row"); if(p.type==="break")r.classList.add("break-row"); if(p.type==="prayer")r.classList.add("prayer-row"); if(p.type==="activity")r.classList.add("activity-row"); r.append(createCell(p.name), createTimeCell(p), createStatusCell(state)); return r; }
function renderTable(){ const s=getSchedule(), c1=el("scheduleCol1"), c2=el("scheduleCol2"); if(c1)c1.replaceChildren(...s.list.filter(p=>p.col===1).map(p=>createRow(p,s))); if(c2)c2.replaceChildren(...s.list.filter(p=>p.col===2).map(p=>createRow(p,s))); }
let visionIndex=0; function updateVision(){ if(!settings.visionMessages.length)return; setText("visionText",settings.visionMessages[visionIndex]); visionIndex=(visionIndex+1)%settings.visionMessages.length; }
function createTickerGroup(){ const g=document.createElement("div"); g.className="ticker-group"; messages.forEach(m=>{ const i=document.createElement("span"); i.className="ticker-item"; i.textContent=m; g.appendChild(i); }); return g; }
function updateTicker(){ const t=el("tickerTrack"); if(t)t.replaceChildren(createTickerGroup(),createTickerGroup()); }
function init(){ const logo=el("schoolLogo"); if(logo)logo.src=settings.schoolLogo; setText("schoolName",settings.schoolName); updateVision(); updateTicker(); }
function tick(){ updateClock(); updateDate(); updateCards(); updateRemaining(); renderTable(); }
init(); tick(); setInterval(tick,1000); setInterval(updateVision,5000);
