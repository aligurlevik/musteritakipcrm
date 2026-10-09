import worker from './phone_alarm_button_entry.js';
import {addGraphicCalendarPatch as injectGraphicCalendarPatch,redactGraphicRevenue} from './graphic_calendar_security_helpers.js';
export {redactGraphicRevenue} from './graphic_calendar_security_helpers.js';

const enc=new TextEncoder();
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function sessionRole(request,env){const match=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)crm_session=([^;]+)/);if(!match)return '';const day=new Date().toISOString().slice(0,10);for(const role of ['admin','graphic','tracking']){const raw=role+'.'+day;if(match[1]===raw+'.'+await hmac(env.SESSION_SECRET||'change-me',raw))return role}return ''}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}})}

const calendarPatch=String.raw`
<style data-graphic-mini-calendar-v4>
body:not(.crm-role-admin) #g_price,body:not(.crm-role-admin) .graphic-price,body:not(.crm-role-admin) #ge_price,body:not(.crm-role-admin) label:has(#ge_price),body:not(.crm-role-admin) [data-revenue-only]{display:none!important}
#graphicMiniCalendarWrap{position:relative;display:inline-flex;align-items:center}
#graphicMiniCalendarButton{height:27px;min-width:35px;padding:0 8px;border:1px solid #2563eb;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:16px;line-height:1;cursor:pointer}
#graphicMiniCalendarButton:hover{background:#dbeafe}
#graphicMiniCalendarInput{position:absolute;right:0;top:31px;z-index:1000;width:145px;padding:5px;border:1px solid #93c5fd;border-radius:7px;background:#fff;box-shadow:0 8px 22px #0f172a33}
#graphicMiniCalendarInput:not(.open){display:none}
#graphicMonthlyRevenue{display:flex!important;align-items:center!important;justify-content:center!important;flex:1 1 280px!important;min-width:250px!important;min-height:38px!important;margin:0!important;padding:8px 12px!important;border:1px solid #22c55e!important;border-radius:10px!important;background:#dcfce7!important;color:#166534!important;font-size:12px!important;font-weight:900!important;text-align:center!important}
#graphicJobs #graphicTurnoverPanel{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important}
#graphicJobs #graphicTurnoverPanel>.graphic-daily-total{grid-column:1!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
#graphicJobs #graphicTurnoverPanel>#graphicMonthlyRevenue{grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
@media(max-width:700px){#graphicJobs #graphicTurnoverPanel{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}
#graphicWeekDeliveryChoices{display:grid;grid-template-columns:repeat(6,minmax(74px,1fr));gap:3px;flex:1 1 auto;min-width:540px}
.graphic-week-day{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;padding:3px;border:1px solid #bfdbfe;border-radius:7px;background:#fff}
.graphic-week-day-title{grid-column:1/-1;border:0;background:#dbeafe;color:#1e3a8a;padding:3px 2px;border-radius:5px;font-size:9px;font-weight:1000;white-space:nowrap}
.graphic-week-time{height:21px;padding:0 2px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;color:#0f172a;font-size:8px;font-weight:900;cursor:pointer}
.graphic-week-time:hover,.graphic-week-time.active{background:#2563eb;color:#fff;border-color:#2563eb}
@media(max-width:1100px){#graphicWeekDeliveryChoices{min-width:100%;grid-template-columns:repeat(3,minmax(90px,1fr))}}
</style>
<script data-graphic-mini-calendar-v4>
(function(){
function setRole(role){document.body.classList.toggle('crm-role-admin',role==='admin')}
async function renderMonthlyRevenue(){
 if(!document.body.classList.contains('crm-role-admin'))return;
 const selected=document.getElementById('g_date')?.value||new Date().toISOString().slice(0,10),parts=selected.split('-'),year=Number(parts[0]),month=Number(parts[1]);
 const from=year+'-'+String(month).padStart(2,'0')+'-01',to=new Date(year,month,0).toISOString().slice(0,10);
 try{
  const response=await fetch('/api/graphic-jobs?created_from='+encodeURIComponent(from)+'&created_to='+encodeURIComponent(to),{cache:'no-store'});if(!response.ok)return;
  const jobs=await response.json(),items=Array.isArray(jobs)?jobs:[],total=items.reduce((sum,job)=>sum+Number(job.price||0),0),months=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  let box=document.getElementById('graphicMonthlyRevenue');if(!box){box=document.createElement('div');box.id='graphicMonthlyRevenue'}
  box.textContent='AYLIK CİRO • '+months[month-1]+' '+year+': '+total.toLocaleString('tr-TR')+' TL • '+items.length+' iş';
  const host=document.getElementById('graphicTurnoverPanel')||document.getElementById('graphicCompactTurnoverRow');if(host&&!box.isConnected)host.appendChild(box);
 }catch(error){console.error('Aylık ciro yüklenemedi:',error)}
}
function mountMiniCalendar(){
 const box=document.getElementById('g_delivery_quick_box'),delivery=document.getElementById('g_delivery'),time=document.getElementById('g_delivery_time');if(!box||!delivery||!time)return false;
 box.querySelectorAll('[data-day-offset],[data-custom-date],[data-quick-time]').forEach(button=>button.remove());
 const lines=box.querySelectorAll('.delivery-quick-line');if(lines[0])lines[0].style.display='none';
 if(!document.getElementById('graphicWeekDeliveryChoices')){
  const pad=n=>String(n).padStart(2,'0'),key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),days=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],root=document.createElement('div');root.id='graphicWeekDeliveryChoices';let cursor=new Date();cursor.setHours(12,0,0,0);let html='';
  for(let shown=0;shown<6;){if(cursor.getDay()!==0){const date=key(cursor),label=days[cursor.getDay()]+' '+cursor.getDate();html+='<div class="graphic-week-day" data-date="'+date+'"><button type="button" class="graphic-week-day-title" data-week-date="'+date+'">'+label+'</button>'+['13:00','16:00','17:00'].map(value=>'<button type="button" class="graphic-week-time" data-week-date="'+date+'" data-week-time="'+value+'">'+value.slice(0,2)+'</button>').join('')+'</div>';shown++}cursor.setDate(cursor.getDate()+1)}
  root.innerHTML=html;box.insertBefore(root,lines[1]||box.firstChild);root.querySelectorAll('[data-week-date]').forEach(button=>button.addEventListener('click',()=>{delivery.value=button.dataset.weekDate;if(button.dataset.weekTime)time.value=button.dataset.weekTime;delivery.dispatchEvent(new Event('change',{bubbles:true}));time.dispatchEvent(new Event('change',{bubbles:true}));root.querySelectorAll('.graphic-week-time').forEach(x=>x.classList.toggle('active',x.dataset.weekDate===delivery.value&&x.dataset.weekTime===time.value))}));
 }
 if(document.getElementById('graphicMiniCalendarWrap'))return true;
 const target=lines[1]||box,wrap=document.createElement('span');wrap.id='graphicMiniCalendarWrap';
 wrap.innerHTML='<button id="graphicMiniCalendarButton" type="button" title="Takvimden tarih seç" aria-label="Takvimden tarih seç">🗓️</button><input id="graphicMiniCalendarInput" type="date" aria-label="Teslim tarihi">';target.appendChild(wrap);
 const button=wrap.querySelector('#graphicMiniCalendarButton'),picker=wrap.querySelector('#graphicMiniCalendarInput');
 button.addEventListener('click',function(event){event.stopPropagation();picker.value=delivery.value||'';picker.classList.toggle('open');if(picker.classList.contains('open')&&typeof picker.showPicker==='function')picker.showPicker()});
 picker.addEventListener('click',event=>event.stopPropagation());picker.addEventListener('change',function(){if(!picker.value)return;delivery.value=picker.value;delivery.dispatchEvent(new Event('change',{bubbles:true}));picker.classList.remove('open')});document.addEventListener('click',()=>picker.classList.remove('open'));return true;
}
async function start(){try{const response=await fetch('/api/session',{cache:'no-store'});setRole(response.ok?(await response.json()).role:'')}catch(_){setRole('')}mountMiniCalendar();renderMonthlyRevenue();document.getElementById('g_date')?.addEventListener('change',()=>setTimeout(renderMonthlyRevenue,100));let tries=0;const timer=setInterval(()=>{mountMiniCalendar();renderMonthlyRevenue();if(++tries>12)clearInterval(timer)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export function addGraphicCalendarPatch(html){return injectGraphicCalendarPatch(html,calendarPatch)}
function rebuild(response,html){const headers=new Headers(response.headers);for(const name of ['content-length','content-encoding','etag'])headers.delete(name);headers.set('cache-control','no-store');return new Response(html,{status:response.status,statusText:response.statusText,headers})}

export default{async fetch(request,env,ctx){
 const url=new URL(request.url),role=await sessionRole(request,env);
 if(request.method==='GET'&&url.pathname==='/api/graphic-jobs-summary'&&role!=='admin')return json({error:'Ciro bilgisi yalnızca Ali kullanıcısına açıktır.'},403);
 if(url.pathname==='/api/graphic-jobs'&&request.method==='GET'&&role!=='admin'){const response=await worker.fetch(request,env,ctx);if(!response.ok)return response;return json(redactGraphicRevenue(await response.json()),response.status,{'x-crm-revenue-redacted':'1'})}
 if(url.pathname==='/api/graphic-jobs'&&request.method==='POST'&&role!=='admin'){const payload=await request.clone().json().catch(()=>({}));delete payload.price;request=new Request(request,{body:JSON.stringify(payload),headers:new Headers(request.headers)})}
 if(/^\/api\/graphic-jobs\/\d+$/.test(url.pathname)&&request.method==='PUT'&&role!=='admin'){const payload=await request.clone().json().catch(()=>({}));delete payload.price;request=new Request(request,{body:JSON.stringify(payload),headers:new Headers(request.headers)})}
 const response=await worker.fetch(request,env,ctx);if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html'))return rebuild(response,addGraphicCalendarPatch(await response.text()));return response
},async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}};
