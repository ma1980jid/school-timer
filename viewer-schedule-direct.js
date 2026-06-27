(function(){
if(window.__viewerScheduleDirectLoaded)return;window.__viewerScheduleDirectLoaded=1;
const P='__SCHEDULE_ROWS__:',slug=new URLSearchParams(location.search).get('school')||window.SCHOOL_TIMER_SLUG||'alsheikh-saif';let rows=[];
function db(){return window.supabase&&window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL,window.SCHOOL_TIMER_SUPABASE_ANON_KEY)}
function m(t){let a=String(t||'').split(':').map(Number);return a.length<2?NaN:a[0]*60+a[1]}
function pad(n){return String(n).padStart(2,'0')}
function f(t){t=(t%1440+1440)%1440;return pad(Math.floor(t/60))+':'+pad(t%60)}
function typ(x){let s=(x.type||'')+' '+(x.name||'');return s.includes('فسحة')?'break':s.includes('صلاة')?'prayer':s.includes('نشاط')?'activity':'normal'}
function list(){let a=rows.map(x=>{let sm=m(x.start),em=m(x.end);if(!x.name||!Number.isFinite(sm)||!Number.isFinite(em))return null;return{name:x.name,start:x.start,end:x.end,startMinutes:sm,endMinutes:em<=sm?em+1440:em,type:typ(x)}}).filter(Boolean);let c=Math.ceil(a.length/2);return a.map((x,i)=>Object.assign(x,{col:i<c?1:2}))}
function oman(){let p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Muscat',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()),o={};p.forEach(x=>o[x.type]=x.value);return{h:+o.hour,m:+o.minute,s:+o.second}}
function set(id,v){let e=document.getElementById(id);if(e&&e.textContent!==v)e.textContent=v}
function range(x){return x?f(x.endMinutes)+' - '+f(x.startMinutes):'--'}
function time(id,x){let e=document.getElementById(id);if(!e)return;e.textContent=range(x);e.setAttribute('dir','ltr')}
function dur(sec){sec=Math.max(0,Math.floor(sec||0));let h=Math.floor(sec/3600),mi=Math.floor(sec%3600/60),s=sec%60;return h?pad(h)+':'+pad(mi)+':'+pad(s):pad(mi)+':'+pad(s)}
function td(v,c){let e=document.createElement('td');if(c)e.className=c;e.textContent=v;return e}
function tr(x,cur,now){let st=cur===x?'جارية':now>=x.endMinutes?'انتهت':'قادمة',r=document.createElement('tr');if(st==='جارية')r.className='current-row';let t=td(range(x),'time-cell');t.setAttribute('dir','ltr');r.append(td(x.name),t,td(st,'status-cell'));return r}
function paint(){let a=list();if(!a.length)return;let o=oman(),now=o.h*60+o.m,cur=a.find(x=>now>=x.startMinutes&&now<x.endMinutes),pre=[...a].reverse().find(x=>x.endMinutes<=now),nxt=a.find(x=>x.startMinutes>now),c1=document.getElementById('scheduleCol1'),c2=document.getElementById('scheduleCol2');if(c1)c1.replaceChildren(...a.filter(x=>x.col===1).map(x=>tr(x,cur,now)));if(c2)c2.replaceChildren(...a.filter(x=>x.col===2).map(x=>tr(x,cur,now)));set('previousName',pre?pre.name:'--');time('previousTime',pre);set('nextName',nxt?nxt.name:'--');time('nextTime',nxt);if(cur){set('currentName',cur.name);time('currentTime',cur);set('countLabel','متبقي من الحصة الحالية');set('remainingTime',dur(cur.endMinutes*60-(now*60+o.s)))}else if(nxt){set('currentName','الحصة\nالخالية');time('currentTime',nxt);set('countLabel','متبقي من الحصة');set('remainingTime',dur(nxt.startMinutes*60-(now*60+o.s)))}else{set('currentName','انتهى\nالدوام');time('currentTime',null);set('countLabel','انتهى اليوم الدراسي');set('remainingTime','00:00')}}
async function load(){let c=db();if(!c)return;let r=await c.from('school_messages').select('message_text').eq('school_slug',slug).eq('is_active',true).like('message_text',P+'%').order('created_at',{ascending:false}).limit(1);if(r.data&&r.data[0]){try{rows=JSON.parse(String(r.data[0].message_text).slice(P.length)).rows||[]}catch(e){}paint()}}
function start(){load();setInterval(paint,1000);setInterval(load,60000)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
