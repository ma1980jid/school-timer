(function(){
  if (window.__viewerScheduleSyncLoaded) return;
  window.__viewerScheduleSyncLoaded = true;

  const PREFIX='__SCHEDULE_ROWS__:';
  const slug=new URLSearchParams(location.search).get('school')||window.SCHOOL_TIMER_SLUG||'alsheikh-saif';
  let rows=[];
  let original=null;

  function mins(t){
    const p=String(t||'').split(':').map(Number);
    return p.length<2?NaN:p[0]*60+p[1];
  }

  function typ(x){
    const s=String((x&&x.type)||'')+' '+String((x&&x.name)||'');
    if(s.includes('فسحة'))return'break';
    if(s.includes('صلاة'))return'prayer';
    if(s.includes('نشاط'))return'activity';
    return'normal';
  }

  function periods(){
    const list=rows.map((x)=>{
      const name=String(x.name||'').trim(),start=String(x.start||'').trim(),end=String(x.end||'').trim();
      const sm=mins(start),em=mins(end);
      if(!name||!start||!end||!Number.isFinite(sm)||!Number.isFinite(em))return null;
      return{name,start,end,type:typ(x),startMinutes:sm,endMinutes:em<=sm?em+1440:em};
    }).filter(Boolean);
    const cut=Math.ceil(list.length/2);
    return list.map((x,i)=>({...x,col:i<cut?1:2}));
  }

  async function load(){
    if(!window.supabase)return;
    const db=window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL,window.SCHOOL_TIMER_SUPABASE_ANON_KEY);
    const r=await db.from('school_messages').select('message_text').eq('school_slug',slug).eq('is_active',true).like('message_text',PREFIX+'%').limit(1);
    if(r.data&&r.data[0]){
      try{rows=JSON.parse(String(r.data[0].message_text).slice(PREFIX.length)).rows||[]}catch(e){}
      try{lastTableSignature=''}catch(e){}
      if(typeof tick==='function')tick();
    }
  }

  function install(){
    if(typeof window.getActivePeriods==='function'&&!original)original=window.getActivePeriods;
    window.getActivePeriods=function(){const p=periods();return p.length?p:(original?original():[])};
  }

  function start(){install();load();setInterval(load,60000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
