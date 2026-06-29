(function(){
  if(window.__dashboardThemeSettingsLoaded)return;
  window.__dashboardThemeSettingsLoaded=true;

  const THEMES=['green','white','gold','blue'];
  const LABELS={green:'الأخضر',white:'الأبيض',gold:'الذهبي',blue:'الأزرق',omani:'الأخضر'};
  const LEGACY={omani:'green'};

  function slug(){return new URLSearchParams(location.search).get('school')||window.SCHOOL_TIMER_SLUG||'alsheikh-saif'}
  function today(){try{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const m=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`}catch(e){return new Date(Date.now()+14400000).toISOString().slice(0,10)}}
  function norm(t){t=String(t||'').trim();t=LEGACY[t]||t;return THEMES.includes(t)?t:'green'}
  function db(){if(!window.supabase||!window.SCHOOL_TIMER_SUPABASE_URL||!window.SCHOOL_TIMER_SUPABASE_ANON_KEY)return null;if(!window.__themeDb)window.__themeDb=window.supabase.createClient(window.SCHOOL_TIMER_SUPABASE_URL,window.SCHOOL_TIMER_SUPABASE_ANON_KEY);return window.__themeDb}
  function toast(t){const x=document.getElementById('toast');if(!x)return alert(t);x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}

  function style(){
    if(document.getElementById('themeSettingsStyle'))return;
    const s=document.createElement('style');s.id='themeSettingsStyle';s.textContent=`
      .themeDlg{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl}
      .themeBox{width:min(560px,96vw);background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 60px rgba(15,23,42,.3);font-family:Tahoma,Arial,sans-serif;color:#0f172a}
      .themeBox h2{text-align:center;margin:0 0 10px;font-size:26px}.themeBox p{text-align:center;color:#64748b;font-weight:800;line-height:1.7}
      .themeGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.themePick{border:2px solid #dbe4ee;border-radius:16px;background:#f8fafc;padding:14px;cursor:pointer;font-weight:900;text-align:center;color:#0f172a}.themePick.on{border-color:#0f766e;background:#ecfeff;color:#0f766e}
      .themeRow{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #dbe4ee;border-radius:14px;padding:12px;margin:10px 0;background:#f8fafc;font-weight:900}.themeRow small{display:block;color:#64748b;margin-top:4px}.themeRow input[type=checkbox]{width:24px;height:24px;accent-color:#0f766e}.themeRow input[type=number],.themeRow input[type=date]{width:145px;height:35px;border:1px solid #cbd5e1;border-radius:10px;text-align:center;font-weight:900}
      .themeActs{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}.themeActs button,.themeOpen{border:1px solid #d6dee8;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer;background:#f8fafc;color:#0f172a}.themeSave{background:#0f172a!important;color:#fff!important}
    `;document.head.appendChild(s)
  }

  async function load(){
    const c=db();if(!c)return null;
    try{const r=await c.from('school_theme_settings').select('selected_theme,default_theme,auto_theme_enabled,auto_theme_days,auto_theme_start_date,manual_theme_locked').eq('school_slug',slug()).maybeSingle();
      if(!r.error&&r.data)return r.data;
    }catch(e){}
    return {selected_theme:'green',default_theme:'green',auto_theme_enabled:false,auto_theme_days:20,auto_theme_start_date:today(),manual_theme_locked:true};
  }

  async function save(data){
    const c=db();if(!c)throw new Error('db');
    const payload={school_slug:slug(),selected_theme:norm(data.theme),default_theme:norm(data.theme),auto_theme_enabled:!!data.auto,auto_theme_days:Math.max(1,Math.min(90,Number(data.days||20))),auto_theme_start_date:data.start||today(),auto_theme_sequence:THEMES,manual_theme_locked:!!data.lock,last_theme_changed_at:new Date().toISOString()};
    const r=await c.from('school_theme_settings').upsert(payload,{onConflict:'school_slug'});
    if(r.error)throw r.error;
    try{localStorage.removeItem('school_timer_effective_theme_'+slug())}catch(e){}
  }

  function row(label,note,input){const d=document.createElement('label');d.className='themeRow';const t=document.createElement('span');t.innerHTML=label+(note?`<small>${note}</small>`:'');d.append(t,input);return d}

  async function open(){
    style();const st=await load();let selected=norm(st&&st.selected_theme||'green');
    const o=document.createElement('div');o.className='themeDlg';
    const b=document.createElement('div');b.className='themeBox';b.innerHTML='<h2>إدارة التصاميم</h2><p>اختر التصميم النشط لشاشات الحاسوب والهاتف.</p>';
    const g=document.createElement('div');g.className='themeGrid';
    THEMES.forEach(t=>{const x=document.createElement('button');x.type='button';x.className='themePick'+(t===selected?' on':'');x.dataset.theme=t;x.textContent=LABELS[t];x.onclick=()=>{selected=t;g.querySelectorAll('.themePick').forEach(y=>y.classList.toggle('on',y.dataset.theme===t))};g.appendChild(x)});
    const lock=Object.assign(document.createElement('input'),{type:'checkbox',checked:st.manual_theme_locked!==false});
    const auto=Object.assign(document.createElement('input'),{type:'checkbox',checked:!!st.auto_theme_enabled});
    const days=Object.assign(document.createElement('input'),{type:'number',min:'1',max:'90',value:Number(st.auto_theme_days||20)});
    const start=Object.assign(document.createElement('input'),{type:'date',value:st.auto_theme_start_date||today()});
    b.append(g,row('قفل التصميم اليدوي','يبقي التصميم المختار ثابتًا.',lock),row('تفعيل التغيير التلقائي','يعمل فقط عند إلغاء القفل اليدوي.',auto),row('مدة كل تصميم باليوم','الافتراضي 20 يومًا.',days),row('تاريخ بداية الدورة','يستخدم للتغيير التلقائي.',start));
    const acts=document.createElement('div');acts.className='themeActs';
    const close=document.createElement('button');close.textContent='إغلاق';close.onclick=()=>o.remove();
    const sv=document.createElement('button');sv.className='themeSave';sv.textContent='حفظ التصميم';sv.onclick=async()=>{sv.disabled=true;sv.textContent='جارٍ الحفظ...';try{await save({theme:selected,lock:lock.checked,auto:auto.checked,days:days.value,start:start.value});sv.textContent='تم الحفظ';toast('تم حفظ التصميم بنجاح');setTimeout(()=>o.remove(),700)}catch(e){console.warn(e);sv.disabled=false;sv.textContent='تعذر الحفظ - أعد المحاولة'}};
    acts.append(close,sv);b.appendChild(acts);o.appendChild(b);o.onclick=e=>{if(e.target===o)o.remove()};document.body.appendChild(o);
  }

  function add(){if(document.getElementById('themeSettingsButton'))return;const a=document.querySelector('.actions');if(!a)return;const btn=document.createElement('button');btn.id='themeSettingsButton';btn.className='btn light themeOpen';btn.type='button';btn.textContent='إدارة التصاميم';btn.onclick=open;a.insertBefore(btn,a.firstChild)}
  function start(){add();setInterval(add,1500)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
