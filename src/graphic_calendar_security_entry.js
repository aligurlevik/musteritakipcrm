import worker from './phone_alarm_button_entry.js';
import {addGraphicCalendarPatch as injectGraphicCalendarPatch,redactGraphicRevenue} from './graphic_calendar_security_helpers.js';

export {redactGraphicRevenue} from './graphic_calendar_security_helpers.js';

const enc=new TextEncoder();

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function sessionRole(request,env){
  const match=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)crm_session=([^;]+)/);
  if(!match)return '';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const raw=role+'.'+day;
    if(match[1]===raw+'.'+await hmac(env.SESSION_SECRET||'change-me',raw))return role;
  }
  return '';
}

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
}

const calendarPatch=String.raw`
<style data-graphic-monthly-calendar-v2>
  #graphicCompactDate{display:block!important}
  #graphicJobs .graphic-agenda-layout{grid-template-columns:minmax(0,1fr) 330px!important;gap:10px!important;align-items:start!important}
  #graphicJobs .graphic-calendar-panel{display:block!important;position:sticky!important;top:8px!important;min-width:0!important;width:330px!important;margin:0!important;padding:8px!important;background:#fff!important;border:2px solid #bfdbfe!important;border-radius:12px!important;box-shadow:0 4px 12px #0f172a12!important}
  #graphicJobs .graphic-calendar-panel .graphic-month-controls{display:flex!important;justify-content:center!important;align-items:center!important;flex-wrap:wrap!important}
  #graphicJobs .graphic-calendar-panel .month-calendar{display:block!important}
  #graphicJobs .graphic-calendar-panel .month-weekdays{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important}
  #graphicJobs .graphic-calendar-panel .month-weekdays>div:last-child{display:none!important}
  #graphicJobs .graphic-calendar-panel .month-grid{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-auto-rows:minmax(44px,auto)!important;gap:3px!important}
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel{display:none!important}
  #graphicJobs .month-day{height:auto!important;min-height:44px!important;border:2px solid transparent!important;border-radius:7px!important;padding:3px!important;transition:transform .12s ease,box-shadow .12s ease!important}
  #graphicJobs .month-day:hover{transform:translateY(-1px);box-shadow:0 5px 12px #0f172a20!important}
  #graphicJobs .month-day.empty{visibility:hidden!important}
  #graphicJobs .month-day.today{outline:3px solid #0f172a!important;outline-offset:1px!important}
  #graphicJobs .month-day-number{font-size:12px!important}
  #graphicJobs .calendar-day-count{display:block;margin-top:2px;font-size:8px;font-weight:900}
  #graphicJobs .calendar-day-revenue{display:block;margin-top:1px;font-size:8px;font-weight:900;color:#065f46}
  body:not(.crm-role-admin) #g_price,
  body:not(.crm-role-admin) .graphic-price,
  body:not(.crm-role-admin) #ge_price,
  body:not(.crm-role-admin) label:has(#ge_price),
  body:not(.crm-role-admin) [data-revenue-only]{display:none!important}
  #g_delivery_quick_box [data-quick-time="12:00"],#g_delivery_quick_box [data-quick-time="16:00"],#g_delivery_quick_box [data-quick-time="17:00"]{display:none!important}
  @media(max-width:1100px){#graphicJobs .graphic-agenda-layout{grid-template-columns:1fr!important}#graphicJobs .graphic-calendar-panel{position:static!important;width:100%!important}#graphicJobs .graphic-calendar-panel .month-grid{grid-auto-rows:minmax(52px,auto)!important}}
</style>
<script data-graphic-monthly-calendar-v2>
(function(){
  const palette=['#fee2e2','#ffedd5','#fef3c7','#dcfce7','#dbeafe','#ede9fe','#fae8ff','#cffafe','#fce7f3','#e2e8f0'];
  let role='';
  const pad=n=>String(n).padStart(2,'0');
  const key=(y,m,d)=>y+'-'+pad(m+1)+'-'+pad(d);
  function colorFor(day){return palette[(day-1)%palette.length]}
  function setRole(next){role=next||'';document.body.classList.toggle('crm-role-admin',role==='admin')}
  function replaceCalendar(){
    if(typeof window.renderGraphicMonth!=='function')return;
    window.renderGraphicMonth=function(){
      const grid=document.getElementById('graphicMonthGrid');if(!grid)return;
      const year=graphicMonthDate.getFullYear(),month=graphicMonthDate.getMonth(),days=new Date(year,month+1,0).getDate();
      const title=document.getElementById('graphicMonthTitle');if(title)title.textContent=graphicMonthDate.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
      let html='',shown=0;
      for(let day=1;day<=days;day++){
        const date=key(year,month,day),dateObj=new Date(year,month,day,12);if(dateObj.getDay()===0)continue;
        if(shown===0){const mondayOffset=(dateObj.getDay()+6)%7;html+='<div class="month-day empty"></div>'.repeat(mondayOffset)}
        shown++;
        const items=(window.graphicMonthJobs||[]).filter(job=>job.work_date===date),count=items.length,revenue=items.reduce((sum,job)=>sum+Number(job.price||0),0),selected=document.getElementById('g_date')?.value===date;
        html+='<button type="button" class="month-day '+(selected?'today':'')+'" style="background:'+colorFor(day)+';border-color:'+colorFor(day)+'" onclick="openGraphicWorkDate(\''+date+'\')"><span class="month-day-number">'+day+'</span><span class="calendar-day-count">'+count+' iş</span>'+(role==='admin'?'<span class="calendar-day-revenue" data-revenue-only>'+revenue.toLocaleString('tr-TR')+' TL</span>':'')+'</button>';
      }
      const tail=(6-(shown%6))%6;grid.innerHTML=html+'<div class="month-day empty"></div>'.repeat(tail);
    };
    window.renderGraphicMonth();
  }
  async function start(){
    try{const response=await fetch('/api/session',{cache:'no-store'});if(response.ok)setRole((await response.json()).role)}catch(_){setRole('')}
    document.querySelectorAll('#g_delivery_quick_box [data-quick-time]').forEach(button=>button.remove());
    replaceCalendar();
    let tries=0;const timer=setInterval(()=>{replaceCalendar();if(++tries>20)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export function addGraphicCalendarPatch(html){
  return injectGraphicCalendarPatch(html,calendarPatch);
}

function rebuild(response,html){
  const headers=new Headers(response.headers);for(const name of ['content-length','content-encoding','etag'])headers.delete(name);headers.set('cache-control','no-store');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),role=await sessionRole(request,env);
    if(request.method==='GET'&&url.pathname==='/api/graphic-jobs-summary'&&role!=='admin')return json({error:'Ciro bilgisi yalnızca Ali kullanıcısına açıktır.'},403);
    if(url.pathname==='/api/graphic-jobs'&&request.method==='GET'&&role!=='admin'){
      const response=await worker.fetch(request,env,ctx);if(!response.ok)return response;
      return json(redactGraphicRevenue(await response.json()),response.status,{'x-crm-revenue-redacted':'1'});
    }
    if(url.pathname==='/api/graphic-jobs'&&request.method==='POST'&&role!=='admin'){
      const payload=await request.clone().json().catch(()=>({}));delete payload.price;
      request=new Request(request,{body:JSON.stringify(payload),headers:new Headers(request.headers)});
    }
    if(/^\/api\/graphic-jobs\/\d+$/.test(url.pathname)&&request.method==='PUT'&&role!=='admin'){
      const payload=await request.clone().json().catch(()=>({}));delete payload.price;
      request=new Request(request,{body:JSON.stringify(payload),headers:new Headers(request.headers)});
    }
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html'))return rebuild(response,addGraphicCalendarPatch(await response.text()));
    return response;
  },
  async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
