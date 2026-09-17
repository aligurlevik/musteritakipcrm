import worker from './quick_request_whatsapp_safe.js';

const COMPLETED_TODAY = String.raw`
<style id="quickRequestCompletedTodaySafeStyle">
#quickRequestCompletedWrap{margin-top:22px;padding-top:16px;border-top:2px solid #e2e8f0}
#quickRequestCompletedWrap h3{margin:0 0 5px;color:#475569}
#quickRequestCompletedWrap .qr-completed-help{font-size:12px;color:#64748b;margin-bottom:10px}
#quickRequestCompletedList{display:grid;gap:9px}
.qr-card.qr-completed{opacity:.76;border-color:#cbd5e1;border-left-color:#94a3b8;background:#f8fafc}
.qr-card.qr-completed .qr-title{color:#475569;text-decoration:line-through}
.qr-undo{border:0;border-radius:8px;background:#dbeafe;color:#1d4ed8;padding:8px 10px;font-weight:900;cursor:pointer;white-space:nowrap}
</style>
<script id="quickRequestCompletedTodaySafeScript">
(function(){
'use strict';
if(window.__quickRequestCompletedTodaySafe)return;
window.__quickRequestCompletedTodaySafe=true;
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function split(note){var raw=String(note||'').replace(/\r\n/g,'\n').trim(),lines=raw.split('\n');return {title:(lines.shift()||'').trim(),detail:lines.join('\n').trim()}}
function isQuick(x){return /^⚡\s+/.test(String(x&&x.note||''))}
async function json(path,opts){var r=await fetch(path,Object.assign({headers:{'content-type':'application/json','cache-control':'no-cache'}},opts||{})),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
function toast(text){var el=document.getElementById('quickRequestToast');if(!el)return;el.textContent=text;el.style.display='block';clearTimeout(window.__qrCompletedToast);window.__qrCompletedToast=setTimeout(function(){el.style.display='none'},2400)}
function ensureSection(){var parent=document.getElementById('quickRequests');if(!parent)return null;var wrap=document.getElementById('quickRequestCompletedWrap');if(wrap)return wrap;wrap=document.createElement('div');wrap.id='quickRequestCompletedWrap';wrap.innerHTML='<h3>✓ Bugün Tamamlananlar</h3><div class="qr-completed-help">Yanlışlıkla tamamladıysan “Geri Al” diyebilirsin. Yarın bu bölüm temiz görünür; tamamlanmamış talepler kalmaya devam eder.</div><div id="quickRequestCompletedList"></div>';parent.appendChild(wrap);return wrap}
async function undo(id){try{await json('/api/agenda/'+id+'/task-undo',{method:'POST',body:'{}'});toast('Talep tekrar bekleyenlere alındı.');await loadCompleted();setTimeout(function(){try{document.getElementById('quickRequestMenu')?.click()}catch(_){}},150)}catch(e){toast(e.message)}}
function render(items){ensureSection();var list=document.getElementById('quickRequestCompletedList');if(!list)return;if(!items.length){list.innerHTML='<div class="qr-empty">Bugün tamamlanan hızlı talep yok.</div>';return}list.innerHTML=items.map(function(x){var p=split(x.note),title=p.title.replace(/^⚡\s+/,''),date=String(x.completed_date||x.entry_date||'');return '<div class="qr-card qr-completed"><div class="qr-card-top"><div><div class="qr-title">✓ '+esc(title)+'</div><div class="qr-detail">'+esc(p.detail)+'</div><div class="qr-meta">Tamamlandı: '+esc(date)+'</div></div><button type="button" class="qr-undo" data-qr-undo="'+Number(x.id)+'">↩ Geri Al</button></div></div>'}).join('');list.querySelectorAll('[data-qr-undo]').forEach(function(b){b.onclick=function(){undo(Number(b.getAttribute('data-qr-undo')))}})}
async function loadCompleted(){try{var s=await json('/api/session');if(!s||s.role!=='admin')return;ensureSection();var items=await json('/api/agenda/completed?date='+encodeURIComponent(today()));items=Array.isArray(items)?items.filter(isQuick):[];render(items)}catch(_){}}
function watch(){ensureSection();loadCompleted();var btn=document.getElementById('quickRequestMenu');if(btn&&!btn.dataset.completedHook){btn.dataset.completedHook='1';btn.addEventListener('click',function(){setTimeout(loadCompleted,180)})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
setInterval(watch,15000);
new MutationObserver(function(){if(document.getElementById('quickRequests'))ensureSection()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

function rebuild(response,html){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(html,{status:response.status,statusText:response.statusText,headers})}

export default{async fetch(request,env,ctx){const response=await worker.fetch(request,env,ctx),backup=response.clone();try{const type=response.headers.get('content-type')||'';if(request.method!=='GET'||!type.includes('text/html'))return response;const html=await response.text();if(html.includes('quickRequestCompletedTodaySafeScript'))return rebuild(response,html);const desktop=html.includes('CRM Müşteri Takip')&&html.includes('class="menu"');if(!desktop)return rebuild(response,html);const next=html.includes('</body>')?html.replace('</body>',COMPLETED_TODAY+'\n</body>'):html+COMPLETED_TODAY;return rebuild(response,next)}catch(error){console.error('Quick request completed-today patch failed',error);return backup}}};
