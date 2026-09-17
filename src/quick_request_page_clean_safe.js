import worker from './quick_request_sort_safe.js';

const QUICK_REQUEST_PAGE_CLEAN = String.raw`
<style id="quickRequestPageCleanSafeStyle">
body.qr-page-open .top>div:last-child{display:none!important}
body.qr-page-open #quickRequests .qr-page-head{justify-content:flex-start!important;align-items:center!important;gap:12px!important}
body.qr-page-open #quickRequests .qr-page-head>div{order:2!important}
body.qr-page-open #quickRequests .qr-new{order:1!important;margin:0!important;flex:0 0 auto!important}
.qre-inline-edit{border:0;border-radius:8px;background:#e0f2fe;color:#075985;padding:7px 9px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}
.qre-inline-edit:hover{background:#bae6fd}
#qreInlineOverlay{position:fixed;inset:0;z-index:480;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.62)}
#qreInlineOverlay.open{display:flex}
#qreInlineBox{width:min(620px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 25px 80px #0007;border-top:7px solid #0284c7}
#qreInlineBox h2{margin:0 0 12px;color:#075985}
#qreInlineBox label{display:block;font-size:12px;font-weight:900;color:#475569;margin:10px 0 5px}
#qreInlineBox input,#qreInlineBox textarea{width:100%;border:2px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit;background:#fff}
#qreInlineBox textarea{min-height:120px;resize:vertical;line-height:1.4}
.qre-inline-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.qre-inline-fileinfo{margin-top:7px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:12px}
.qre-inline-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
.qre-inline-actions button{border:0;border-radius:9px;padding:9px 13px;font-weight:900;cursor:pointer}.qre-inline-cancel{background:#e2e8f0;color:#334155}.qre-inline-save{background:#0284c7;color:#fff}
@media(max-width:720px){body.qr-page-open #quickRequests .qr-page-head{align-items:flex-start!important}body.qr-page-open #quickRequests .qr-new{width:auto!important}}
@media(max-width:560px){.qre-inline-grid{grid-template-columns:1fr}.qre-inline-actions button{flex:1}}
</style>
<script id="quickRequestPageCleanSafeScript">
(function(){
'use strict';
if(window.__quickRequestPageCleanSafe)return;
window.__quickRequestPageCleanSafe=true;
var editId=0,editRow=null,editFile=null,editBusy=false,editTimer=null;
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function split(note){var raw=String(note||'').replace(/\r\n/g,'\n').trim(),lines=raw.split('\n');return {title:(lines.shift()||'').trim().replace(/^⚡\s+/,''),detail:lines.join('\n').trim()}}
async function api(path,opts){var r=await fetch(path,Object.assign({headers:{'cache-control':'no-cache'}},opts||{})),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
function toast(text){var el=document.getElementById('quickRequestToast');if(el){el.textContent=text;el.style.display='block';clearTimeout(window.__qreInlineToast);window.__qreInlineToast=setTimeout(function(){el.style.display='none'},2600)}else alert(text)}
function sync(){var section=document.getElementById('quickRequests');document.body.classList.toggle('qr-page-open',!!(section&&section.classList.contains('active')))}
function ensureEditor(){
 if(document.getElementById('qreInlineOverlay'))return;
 var o=document.createElement('div');o.id='qreInlineOverlay';o.innerHTML='<div id="qreInlineBox" role="dialog" aria-modal="true"><h2>✏ Hızlı Talebi Düzenle</h2><label>MÜŞTERİ / BAŞLIK</label><input id="qreInlineTitle" autocomplete="off"><label>TALEP / NOT</label><textarea id="qreInlineDetail"></textarea><div class="qre-inline-grid"><div><label>TARİH</label><input id="qreInlineDate" type="date"></div><div><label>ALARM SAATİ</label><input id="qreInlineTime" type="time" step="300"></div></div><label>RESİM / PDF REVİZE</label><input id="qreInlineFile" type="file" accept=".pdf,image/jpeg,image/png,image/webp"><div id="qreInlineFileInfo" class="qre-inline-fileinfo">Yeni dosya seçmezsen mevcut dosya korunur.</div><div class="qre-inline-actions"><button type="button" id="qreInlineCancel" class="qre-inline-cancel">Vazgeç</button><button type="button" id="qreInlineSave" class="qre-inline-save">💾 Değişiklikleri Kaydet</button></div></div>';
 o.onclick=function(e){if(e.target===o)closeEditor()};document.body.appendChild(o);document.getElementById('qreInlineCancel').onclick=closeEditor;document.getElementById('qreInlineSave').onclick=saveEditor;document.getElementById('qreInlineFile').onchange=function(){editFile=this.files&&this.files[0]||null;showFileInfo()}
}
function closeEditor(){document.getElementById('qreInlineOverlay')?.classList.remove('open');editId=0;editRow=null;editFile=null;var f=document.getElementById('qreInlineFile');if(f)f.value=''}
function showFileInfo(existing){var el=document.getElementById('qreInlineFileInfo');if(!el)return;if(editFile){el.textContent='Yeni dosya: '+editFile.name;return}if(existing){el.textContent='Mevcut dosya: '+existing.file_name+' — yeni dosya seçmezsen korunur.';return}el.textContent='Dosya yok. İstersen yeni resim veya PDF seçebilirsin.'}
async function findRow(id){var rows=await api('/api/agenda/active?from='+encodeURIComponent(today()));return (Array.isArray(rows)?rows:[]).find(function(x){return Number(x.id)===Number(id)})||null}
async function findFile(id){try{var rows=await api('/api/quick-request-files?ids='+encodeURIComponent(String(id)));return Array.isArray(rows)&&rows[0]?rows[0]:null}catch(_){return null}}
async function openEditor(id){ensureEditor();try{var row=await findRow(id);if(!row)return toast('Talep bulunamadı.');editId=Number(id);editRow=row;editFile=null;var p=split(row.note);document.getElementById('qreInlineTitle').value=p.title;document.getElementById('qreInlineDetail').value=p.detail;document.getElementById('qreInlineDate').value=row.entry_date||today();document.getElementById('qreInlineTime').value=row.remind_at?String(row.remind_at).slice(11,16):'';var f=document.getElementById('qreInlineFile');if(f)f.value='';showFileInfo(await findFile(id));document.getElementById('qreInlineOverlay').classList.add('open')}catch(e){toast(e.message)}}
async function upload(id,file){var fd=new FormData();fd.append('file',file,file.name);var r=await fetch('/api/quick-request-file/'+id,{method:'POST',body:fd}),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Dosya yüklenemedi.');return d}
async function saveEditor(){if(editBusy||!editId||!editRow)return;var title=String(document.getElementById('qreInlineTitle')?.value||'').trim(),detail=String(document.getElementById('qreInlineDetail')?.value||'').trim(),date=document.getElementById('qreInlineDate')?.value||today(),time=document.getElementById('qreInlineTime')?.value||'';if(!title)return toast('Başlık boş olamaz.');if(!detail)return toast('Talep / not boş olamaz.');if(editFile&&editFile.size>5*1024*1024)return toast('Dosya en fazla 5 MB olabilir.');editBusy=true;try{await api('/api/agenda/'+editId,{method:'PUT',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify({entry_date:date,note:'⚡ '+title+'\n'+detail,remind_at:time?date+'T'+time:''})});if(editFile)await upload(editId,editFile);closeEditor();toast('Talep güncellendi.');var menu=document.getElementById('quickRequestMenu');if(menu)setTimeout(function(){try{menu.click()}catch(_){}},80);if(typeof window.loadAgenda==='function')try{await window.loadAgenda()}catch(_){}}catch(e){toast(e.message)}finally{editBusy=false}}
function decorateEdit(){
 document.querySelectorAll('#quickRequestList .qr-card').forEach(function(card){
  var done=card.querySelector('[data-qr-done]');if(!done)return;var id=Number(done.getAttribute('data-qr-done'));if(!id)return;
  var btn=card.querySelector('[data-qre-inline-edit="'+id+'"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='qre-inline-edit';btn.dataset.qreInlineEdit=String(id);btn.textContent='✏ Düzenle';btn.onclick=function(e){e.stopPropagation();openEditor(id)}}
  var host=card.querySelector('.qrc-right')||done.parentElement;if(btn.parentElement!==host)host.insertBefore(btn,done);else if(btn.nextSibling!==done)host.insertBefore(btn,done)
 })
}
function apply(){sync();ensureEditor();decorateEdit()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,120)},{once:true});else setTimeout(apply,120);
new MutationObserver(function(){sync();clearTimeout(editTimer);editTimer=setTimeout(decorateEdit,80)}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',function(){setTimeout(function(){sync();decorateEdit()},0)},true);document.addEventListener('keydown',function(e){if(e.key==='Escape')closeEditor()});
})();
</script>`;

function rebuild(response,html){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(html,{status:response.status,statusText:response.statusText,headers})}

export default{async fetch(request,env,ctx){const response=await worker.fetch(request,env,ctx),backup=response.clone();try{const type=response.headers.get('content-type')||'';if(request.method!=='GET'||!type.includes('text/html'))return response;const html=await response.text();if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestPageCleanSafeScript'))return rebuild(response,html);const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_PAGE_CLEAN+'\n</body>'):html+QUICK_REQUEST_PAGE_CLEAN;return rebuild(response,next)}catch(error){console.error('Quick request page clean patch failed',error);return backup)}};
