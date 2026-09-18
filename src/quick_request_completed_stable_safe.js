import worker from './quick_request_title_color_safe.js';

const COMPLETED_STABLE = String.raw`
<style id="quickRequestCompletedStableStyle">
#quickRequestCompletedV2{display:none!important}
#quickRequestCompletedStable{margin-top:14px}
#quickRequestCompletedStable h3{margin:0 0 6px;font-size:14px;color:#64748b}
#quickRequestCompletedStable .qrcs-list{display:grid;gap:6px}
#quickRequestCompletedStable .qrcs-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;min-height:40px;padding:6px 10px;background:#f8fafc;border:1px solid #cbd5e1;border-left:6px solid #94a3b8;border-radius:10px}
#quickRequestCompletedStable .qrcs-title{display:inline-block;color:#7e22ce;background:#f3e8ff;border:1px solid #e9d5ff;border-radius:7px;padding:2px 7px;font-weight:950;cursor:pointer;user-select:none}
#quickRequestCompletedStable .qrcs-title:after{content:'  ›';font-weight:900;opacity:.65}
#quickRequestCompletedStable .qrcs-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;white-space:nowrap}
#quickRequestCompletedStable .qrcs-undo{border:0;border-radius:8px;background:#dbeafe;color:#1d4ed8;padding:6px 8px;font-size:11px;font-weight:900;cursor:pointer}
#quickRequestCompletedStable .qrcs-delete{border:0;border-radius:8px;background:#fee2e2;color:#b91c1c;padding:6px 8px;font-size:11px;font-weight:900;cursor:pointer}
#quickRequestCompletedStable .qrcs-empty{padding:12px;text-align:center;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;background:#fff}
#qrcsOverlay{position:fixed;inset:0;z-index:435;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.62)}
#qrcsOverlay.open{display:flex}
#qrcsBox{width:min(560px,94vw);max-height:86vh;overflow:auto;background:#fff;border-radius:15px;padding:18px;box-shadow:0 24px 70px #0006;border-top:6px solid #7e22ce}
#qrcsBox h3{margin:0 0 12px;color:#7e22ce;font-size:18px}
#qrcsDetail{white-space:pre-wrap;line-height:1.5;color:#1f2937;font-size:14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}
#qrcsFiles{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
#qrcsFiles a{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:8px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:12px;font-weight:900;border:1px solid #bfdbfe}
#qrcsClose{margin-top:14px;border:0;border-radius:9px;background:#e2e8f0;color:#334155;padding:9px 13px;font-weight:900;cursor:pointer}
@media(max-width:760px){#quickRequestCompletedStable .qrcs-card{grid-template-columns:1fr}.qrcs-actions{justify-content:flex-start!important}}
</style>
<script id="quickRequestCompletedStableScript">
(function(){
'use strict';if(window.__quickRequestCompletedStable)return;window.__quickRequestCompletedStable=true;
var lastSignature='',itemsById={};
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function split(note){var raw=String(note||'').replace(/\r\n/g,'\n').trim(),lines=raw.split('\n');return {title:(lines.shift()||'').trim().replace(/^⚡\s+/,''),detail:lines.join('\n').trim()}}
function isQuick(x){return /^⚡\s+/.test(String(x&&x.note||''))}
async function api(path,opts){var r=await fetch(path,Object.assign({headers:{'cache-control':'no-cache'}},opts||{})),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
function toast(text){var el=document.getElementById('quickRequestToast');if(el){el.textContent=text;el.style.display='block';clearTimeout(window.__qrcsToast);window.__qrcsToast=setTimeout(function(){el.style.display='none'},2500)}else alert(text)}
function ensure(){
 var legacy=document.getElementById('quickRequestCompletedV2');
 if(!legacy)return false;
 if(!document.getElementById('quickRequestCompletedStable')){var w=document.createElement('div');w.id='quickRequestCompletedStable';w.innerHTML='<h3>BUGÜN TAMAMLANANLAR</h3><div class="qrcs-list"><div class="qrcs-empty">Bugün tamamlanan not yok.</div></div>';legacy.insertAdjacentElement('afterend',w)}
 if(!document.getElementById('qrcsOverlay')){var o=document.createElement('div');o.id='qrcsOverlay';o.innerHTML='<div id="qrcsBox"><h3 id="qrcsTitle"></h3><div id="qrcsDetail"></div><div id="qrcsFiles"></div><button type="button" id="qrcsClose">Kapat</button></div>';o.onclick=function(e){if(e.target===o)o.classList.remove('open')};document.body.appendChild(o);document.getElementById('qrcsClose').onclick=function(){o.classList.remove('open')}}
 return true;
}
async function filesFor(ids){if(!ids.length)return {};try{var rows=await api('/api/quick-request-files?ids='+encodeURIComponent(ids.join(','))),out={};(Array.isArray(rows)?rows:[]).forEach(function(x){out[Number(x.agenda_id)]=x});return out}catch(_){return {}}}
async function refresh(){if(!ensure())return;try{var rows=await api('/api/agenda/completed?date='+encodeURIComponent(today())),items=(Array.isArray(rows)?rows:[]).filter(isQuick),files=await filesFor(items.map(function(x){return Number(x.id)}));var sig=JSON.stringify(items.map(function(x){return [x.id,x.note,x.completed_date]}).concat(Object.keys(files).sort().map(function(k){return [k,files[k].file_name,files[k].mime_type]})));itemsById={};items.forEach(function(x){itemsById[Number(x.id)]={row:x,file:files[Number(x.id)]||null}});if(sig===lastSignature)return;lastSignature=sig;var list=document.querySelector('#quickRequestCompletedStable .qrcs-list');if(!list)return;if(!items.length){list.innerHTML='<div class="qrcs-empty">Bugün tamamlanan not yok.</div>';return}list.innerHTML=items.map(function(x){var p=split(x.note);return '<div class="qrcs-card" data-id="'+Number(x.id)+'"><div><span class="qrcs-title" data-qrcs-open="'+Number(x.id)+'">⚡ '+esc(p.title)+'</span></div><div class="qrcs-actions"><button type="button" class="qrcs-undo" data-qrcs-undo="'+Number(x.id)+'">↩ Geri Al</button><button type="button" class="qrcs-delete" data-qrcs-delete="'+Number(x.id)+'">🗑 Sil</button></div></div>'}).join('')
}catch(_){} }
async function undo(id){try{await api('/api/agenda/'+id+'/task-undo',{method:'POST',body:'{}'});lastSignature='';toast('Not tekrar bekleyenlere alındı.');await refresh();var menu=document.getElementById('quickRequestMenu');if(menu)setTimeout(function(){try{menu.click()}catch(_){}},80)}catch(e){toast(e.message)}}
async function del(id){if(!confirm('Bu not tamamen silinsin mi?'))return;try{await api('/api/agenda/'+id,{method:'DELETE'});lastSignature='';toast('Not silindi.');await refresh()}catch(e){toast(e.message)}}
function openDetail(id){var item=itemsById[Number(id)];if(!item)return;ensure();var p=split(item.row.note);document.getElementById('qrcsTitle').textContent='⚡ '+p.title;document.getElementById('qrcsDetail').textContent=p.detail||'Ayrıntı yok.';var f=document.getElementById('qrcsFiles');f.innerHTML='';if(item.file){var a=document.createElement('a');a.href='/api/quick-request-file/'+Number(id);a.target='_blank';a.rel='noopener';a.textContent=(item.file.mime_type==='application/pdf'?'📄 PDF':'🖼️ Resim')+' — '+item.file.file_name;f.appendChild(a)}document.getElementById('qrcsOverlay').classList.add('open')}
document.addEventListener('click',function(e){var u=e.target.closest('[data-qrcs-undo]');if(u){e.stopPropagation();undo(Number(u.dataset.qrcsUndo));return}var d=e.target.closest('[data-qrcs-delete]');if(d){e.stopPropagation();del(Number(d.dataset.qrcsDelete));return}var t=e.target.closest('[data-qrcs-open]');if(t){e.stopPropagation();openDetail(Number(t.dataset.qrcsOpen))}});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.getElementById('qrcsOverlay')?.classList.remove('open')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,250)},{once:true});else setTimeout(refresh,250);
setInterval(refresh,30000);
})();
</script>`;

function rebuild(response,html){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(html,{status:response.status,statusText:response.statusText,headers})}

export default{async fetch(request,env,ctx){const response=await worker.fetch(request,env,ctx),backup=response.clone();try{const type=response.headers.get('content-type')||'';if(request.method!=='GET'||!type.includes('text/html'))return response;const html=await response.text();if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestCompletedStableScript'))return rebuild(response,html);const next=html.includes('</body>')?html.replace('</body>',COMPLETED_STABLE+'\n</body>'):html+COMPLETED_STABLE;return rebuild(response,next)}catch(error){console.error('Completed stable patch failed',error);return backup}}};
