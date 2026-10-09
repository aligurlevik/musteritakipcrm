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
 const box=document.getElementById('g_delivery_quick_box'),delivery=document.getElementById('g_delivery');if(!box||!delivery)return false;
 box.querySelectorAll('[data-quick-time="12:00"],[data-quick-time="16:00"],[data-quick-time="17:00"]').forEach(button=>button.remove());
 if(document.getElementById('graphicMiniCalendarWrap'))return true;
 const lines=box.querySelectorAll('.delivery-quick-line'),target=lines[1]||box,wrap=document.createElement('span');wrap.id='graphicMiniCalendarWrap';
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
