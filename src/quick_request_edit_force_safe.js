import worker from './quick_request_page_clean_safe.js';

const PATCH = String.raw`
<style id="quickRequestEditForceSafeStyle">
#quickRequestList .qref-edit{border:0;border-radius:8px;background:#e0f2fe;color:#075985;padding:7px 9px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}
#quickRequestList .qref-edit:hover{background:#bae6fd}
#qrefOverlay{position:fixed;inset:0;z-index:520;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.62)}
#qrefOverlay.open{display:flex}
#qrefBox{width:min(620px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 25px 80px #0007;border-top:7px solid #0284c7}
#qrefBox h2{margin:0 0 12px;color:#075985}
#qrefBox label{display:block;font-size:12px;font-weight:900;color:#475569;margin:10px 0 5px}
#qrefBox input,#qrefBox textarea{width:100%;border:2px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit;background:#fff}
#qrefBox textarea{min-height:120px;resize:vertical;line-height:1.4}
.qref-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#qrefFileInfo{margin-top:7px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:12px}
.qref-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
.qref-actions button{border:0;border-radius:9px;padding:9px 13px;font-weight:900;cursor:pointer}.qref-cancel{background:#e2e8f0;color:#334155}.qref-save{background:#0284c7;color:#fff}
@media(max-width:560px){.qref-grid{grid-template-columns:1fr}.qref-actions button{flex:1}}
</style>
<script id="quickRequestEditForceSafeScript">
(function(){
'use strict';
if(window.__quickRequestEditForceSafe)return;window.__quickRequestEditForceSafe=true;
var currentId=0,currentRow=null,newFile=null,busy=false;
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function split(note){var raw=String(note||'').replace(/\r\n/g,'\n').trim(),lines=raw.split('\n');return {title:(lines.shift()||'').trim().replace(/^⚡\s+/,''),detail:lines.join('\n').trim()}}
async function api(path,opts){var r=await fetch(path,Object.assign({headers:{'cache-control':'no-cache'}},opts||{})),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
function toast(text){var el=document.getElementById('quickRequestToast');if(el){el.textContent=text;el.style.display='block';clearTimeout(window.__qrefToast);window.__qrefToast=setTimeout(function(){el.style.display='none'},2600)}else alert(text)}
function ensureOverlay(){if(document.getElementById('qrefOverlay'))return;var o=document.createElement('div');o.id='qrefOverlay';o.innerHTML='<div id="qrefBox" role="dialog" aria-modal="true"><h2>✏ Hızlı Talebi Düzenle</h2><label>MÜŞTERİ / BAŞLIK</label><input id="qrefTitle" autocomplete="off"><label>TALEP / NOT</label><textarea id="qrefDetail"></textarea><div class="qref-grid"><div><label>TARİH</label><input id="qrefDate" type="date"></div><div><label>ALARM SAATİ</label><input id="qrefTime" type="time" step="300"></div></div><label>RESİM / PDF REVİZE</label><input id="qrefFile" type="file" accept=".pdf,image/jpeg,image/png,image/webp"><div id="qrefFileInfo">Yeni dosya seçmezsen mevcut dosya korunur.</div><div class="qref-actions"><button type="button" id="qrefCancel" class="qref-cancel">Vazgeç</button><button type="button" id="qrefSave" class="qref-save">💾 Değişiklikleri Kaydet</button></div></div>';o.onclick=function(e){if(e.target===o)closeEditor()};document.body.appendChild(o);document.getElementById('qrefCancel').onclick=closeEditor;document.getElementById('qrefSave').onclick=saveEditor;document.getElementById('qrefFile').onchange=function(){newFile=this.files&&this.files[0]||null;showFileInfo()}}
function closeEditor(){document.getElementById('qrefOverlay')?.classList.remove('open');currentId=0;currentRow=null;newFile=null;var f=document.getElementById('qrefFile');if(f)f.value=''}
function showFileInfo(existing){var el=document.getElementById('qrefFileInfo');if(!el)return;if(newFile){el.textContent='Yeni dosya: '+newFile.name;return}if(existing){el.textContent='Mevcut dosya: '+existing.file_name+' — yeni dosya seçmezsen korunur.';return}el.textContent='Dosya yok. İstersen yeni resim veya PDF seçebilirsin.'}
async function getRow(id){var rows=await api('/api/agenda/active?from='+encodeURIComponent(today()));return (Array.isArray(rows)?rows:[]).find(function(x){return Number(x.id)===Number(id)})||null}
async function getFile(id){try{var rows=await api('/api/quick-request-files?ids='+encodeURIComponent(String(id)));return Array.isArray(rows)&&rows[0]?rows[0]:null}catch(_){return null}}
async function openEditor(id){ensureOverlay();try{var row=await getRow(id);if(!row)return toast('Talep bulunamadı.');currentId=Number(id);currentRow=row;newFile=null;var p=split(row.note);document.getElementById('qrefTitle').value=p.title;document.getElementById('qrefDetail').value=p.detail;document.getElementById('qrefDate').value=row.entry_date||today();document.getElementById('qrefTime').value=row.remind_at?String(row.remind_at).slice(11,16):'';var f=document.getElementById('qrefFile');if(f)f.value='';showFileInfo(await getFile(id));document.getElementById('qrefOverlay').classList.add('open')}catch(e){toast(e.message)}}
async function upload(id,file){var fd=new FormData();fd.append('file',file,file.name);var r=await fetch('/api/quick-request-file/'+id,{method:'POST',body:fd}),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Dosya yüklenemedi.');return d}
async function saveEditor(){if(busy||!currentId||!currentRow)return;var title=String(document.getElementById('qrefTitle')?.value||'').trim(),detail=String(document.getElementById('qrefDetail')?.value||'').trim(),date=document.getElementById('qrefDate')?.value||today(),time=document.getElementById('qrefTime')?.value||'';if(!title)return toast('Başlık boş olamaz.');if(newFile&&newFile.size>5*1024*1024)return toast('Dosya en fazla 5 MB olabilir.');busy=true;try{var note='⚡ '+title+(detail?'\n'+detail:'');await api('/api/agenda/'+currentId,{method:'PUT',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify({entry_date:date,note:note,remind_at:time?date+'T'+time:''})});if(newFile)await upload(currentId,newFile);closeEditor();toast('Talep güncellendi.');var menu=document.getElementById('quickRequestMenu');if(menu)setTimeout(function(){try{menu.click()}catch(_){}},100)}catch(e){toast(e.message)}finally{busy=false}}
function ensureButtons(){document.querySelectorAll('#quickRequestList .qr-card').forEach(function(card){var done=card.querySelector('[data-qr-done]');if(!done)return;var id=Number(done.getAttribute('data-qr-done'));if(!id||card.querySelector('[data-qref-edit="'+id+'"]'))return;var b=document.createElement('button');b.type='button';b.className='qref-edit';b.dataset.qrefEdit=String(id);b.textContent='✏ Düzenle';b.onclick=function(e){e.stopPropagation();openEditor(id)};var host=card.querySelector('.qrc-right')||done.parentElement;if(host&&done.parentElement===host)host.insertBefore(b,done);else if(host)host.appendChild(b)})}
function apply(){ensureOverlay();ensureButtons()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,150)},{once:true});else setTimeout(apply,150);
var mt;new MutationObserver(function(){clearTimeout(mt);mt=setTimeout(ensureButtons,120)}).observe(document.documentElement,{subtree:true,childList:true});
setInterval(ensureButtons,2000);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeEditor()});
})();
</script>`;

function rebuild(response,html){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(html,{status:response.status,statusText:response.statusText,headers})}

export default{async fetch(request,env,ctx){const response=await worker.fetch(request,env,ctx),backup=response.clone();try{const type=response.headers.get('content-type')||'';if(request.method!=='GET'||!type.includes('text/html'))return response;const html=await response.text();if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestEditForceSafeScript'))return rebuild(response,html);const next=html.includes('</body>')?html.replace('</body>',PATCH+'\n</body>'):html+PATCH;return rebuild(response,next)}catch(error){console.error('Quick request forced editor patch failed',error);return backup)}};
