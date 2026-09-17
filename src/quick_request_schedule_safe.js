import worker from './quick_request_files_completed_safe.js';

const QUICK_REQUEST_SCHEDULE = String.raw`
<style id="quickRequestScheduleSafeStyle">
#quickRequestScheduleV3{margin-top:12px;padding:11px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff}
#quickRequestScheduleV3 .qrs-title{font-size:12px;font-weight:950;color:#1e3a8a;margin-bottom:7px}
#quickRequestScheduleV3 .qrs-row{display:grid;grid-template-columns:minmax(150px,1fr) minmax(110px,.65fr);gap:8px}
#quickRequestScheduleV3 input{background:#fff!important}
#quickRequestScheduleV3 .qrs-fast{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#quickRequestScheduleV3 .qrs-fast button{border:1px solid #bfdbfe;background:#fff;color:#1d4ed8;border-radius:8px;padding:7px 9px;font-size:12px;font-weight:900;cursor:pointer}
#quickRequestScheduleV3 .qrs-help{margin-top:7px;font-size:11px;color:#64748b}
.qrs-badge{display:inline-flex;align-items:center;gap:4px;margin-top:7px;margin-right:5px;padding:4px 7px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-size:11px;font-weight:900}
@media(max-width:560px){#quickRequestScheduleV3 .qrs-row{grid-template-columns:1fr 1fr}}
</style>
<script id="quickRequestScheduleSafeScript">
(function(){
'use strict';
if(window.__quickRequestScheduleSafe)return;
window.__quickRequestScheduleSafe=true;

function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function timeKey(d){d=d||new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function plusDays(n){var d=new Date();d.setDate(d.getDate()+n);return dateKey(d)}
function plusHour(){var d=new Date(Date.now()+60*60*1000);d.setMinutes(Math.ceil(d.getMinutes()/5)*5,0,0);return {date:dateKey(d),time:timeKey(d)}}
function formatAlarm(v){if(!v)return '';try{return new Date(v).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return v}}
function isQuickNote(note){return /^⚡\s+/.test(String(note||''))}

function setSchedule(date,time){var d=document.getElementById('quickRequestDateV3'),t=document.getElementById('quickRequestTimeV3');if(d)d.value=date||'';if(t)t.value=time||''}
function resetSchedule(){setSchedule(dateKey(),'')}

function ensureSchedule(){
  var box=document.getElementById('quickRequestBox');
  if(!box)return false;
  if(!document.getElementById('quickRequestScheduleV3')){
    var wrap=document.createElement('div');
    wrap.id='quickRequestScheduleV3';
    wrap.innerHTML='<div class="qrs-title">📅 GÖRÜŞME ZAMANI / 🔔 ALARM</div><div class="qrs-row"><input id="quickRequestDateV3" type="date"><input id="quickRequestTimeV3" type="time" step="300"></div><div class="qrs-fast"><button type="button" data-qrs="today">Bugün</button><button type="button" data-qrs="tomorrow">Yarın</button><button type="button" data-qrs="plus1">+1 Saat</button><button type="button" data-qrs="clear">Alarm Yok</button></div><div class="qrs-help">Tarih + saat girersen CRM o saatte sesli alarm verir. Saat boşsa sadece takvime kaydolur.</div>';
    var picked=document.getElementById('quickRequestFilePickedV2'),actions=box.querySelector('.qr-actions');
    if(picked)box.insertBefore(wrap,picked);else if(actions)box.insertBefore(wrap,actions);else box.appendChild(wrap);
    resetSchedule();
    wrap.querySelector('[data-qrs="today"]').onclick=function(){var t=document.getElementById('quickRequestTimeV3');setSchedule(dateKey(),t?t.value:'')};
    wrap.querySelector('[data-qrs="tomorrow"]').onclick=function(){var t=document.getElementById('quickRequestTimeV3');setSchedule(plusDays(1),t?t.value:'')};
    wrap.querySelector('[data-qrs="plus1"]').onclick=function(){var x=plusHour();setSchedule(x.date,x.time)};
    wrap.querySelector('[data-qrs="clear"]').onclick=function(){setSchedule(dateKey(),'')};
  }
  attachOpenDefaults();
  attachSavePermission();
  return true;
}

function attachOpenDefaults(){
  var float=document.getElementById('quickRequestFloat');
  if(float&&!float.dataset.qrsOpen){float.dataset.qrsOpen='1';float.addEventListener('click',function(){setTimeout(resetSchedule,0)})}
  document.querySelectorAll('.qr-new').forEach(function(b){if(b.dataset.qrsOpen)return;b.dataset.qrsOpen='1';b.addEventListener('click',function(){setTimeout(resetSchedule,0)})});
}

function attachSavePermission(){
  var save=document.getElementById('quickRequestSave');
  if(!save||save.dataset.qrsPermission)return;
  save.dataset.qrsPermission='1';
  save.addEventListener('click',function(){
    var d=document.getElementById('quickRequestDateV3')?.value||'',t=document.getElementById('quickRequestTimeV3')?.value||'';
    if(!d||!t)return;
    try{if(typeof window.enableNotifications==='function'&&('Notification'in window)&&Notification.permission==='default')window.enableNotifications()}catch(_){}
  },true);
}

var originalFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  try{
    var raw=typeof input==='string'?input:(input&&input.url)||'',url=new URL(raw,location.href),method=String((init&&init.method)||'GET').toUpperCase();
    if(url.pathname==='/api/agenda'&&method==='POST'&&init&&typeof init.body==='string'){
      var payload=JSON.parse(init.body);
      if(payload&&isQuickNote(payload.note)){
        var d=document.getElementById('quickRequestDateV3')?.value||dateKey(),t=document.getElementById('quickRequestTimeV3')?.value||'';
        payload.entry_date=d;
        payload.remind_at=d&&t?d+'T'+t:'';
        init=Object.assign({},init,{body:JSON.stringify(payload)});
      }
    }
  }catch(_){}
  return originalFetch(input,init);
};

async function decorateAlarmBadges(){
  var list=document.getElementById('quickRequestList');if(!list)return;
  var buttons=[...list.querySelectorAll('[data-qr-done]')],ids=buttons.map(function(b){return Number(b.getAttribute('data-qr-done'))}).filter(Boolean);if(!ids.length)return;
  try{
    var r=await originalFetch('/api/agenda/active?from='+encodeURIComponent(dateKey()),{headers:{'cache-control':'no-cache'}});if(!r.ok)return;var rows=await r.json(),map={};
    (Array.isArray(rows)?rows:[]).forEach(function(x){if(ids.includes(Number(x.id))&&isQuickNote(x.note))map[Number(x.id)]=x});
    buttons.forEach(function(b){
      var id=Number(b.getAttribute('data-qr-done')),x=map[id],card=b.closest('.qr-card');if(!card)return;
      var badge=card.querySelector('[data-qrs-badge]');
      if(!x){if(badge)badge.remove();return}
      var text=x.remind_at?'🔔 '+formatAlarm(x.remind_at):'📅 '+String(x.entry_date||'');
      if(badge){if(badge.textContent!==text)badge.textContent=text;return}
      badge=document.createElement('span');badge.className='qrs-badge';badge.dataset.qrsBadge=String(id);badge.textContent=text;
      var meta=card.querySelector('.qr-meta');if(meta)meta.insertAdjacentElement('beforebegin',badge);else card.querySelector('.qr-detail')?.insertAdjacentElement('afterend',badge)
    })
  }catch(_){}
}

function apply(){if(ensureSchedule())decorateAlarmBadges()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,100)},{once:true});else setTimeout(apply,100);
var timer;new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(apply,220)}).observe(document.documentElement,{subtree:true,childList:true});
setInterval(decorateAlarmBadges,30000);
})();
</script>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx),backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestScheduleSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_SCHEDULE+'\n</body>'):html+QUICK_REQUEST_SCHEDULE;
      return rebuild(response,next);
    }catch(error){console.error('Quick request schedule patch failed',error);return backup}
  }
};
