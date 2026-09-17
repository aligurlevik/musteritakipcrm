import worker from './quick_request_sort_safe.js';

const PATCH = String.raw`
<style id="quickRequestPageCleanEditV2Style">
body.qr-page-open .top>div:last-child{display:none!important}
body.qr-page-open #quickRequests .qr-page-head{justify-content:flex-start!important;align-items:center!important;gap:12px!important}
body.qr-page-open #quickRequests .qr-page-head>div{order:2!important}
body.qr-page-open #quickRequests .qr-new{order:1!important;margin:0!important;flex:0 0 auto!important}
.qrv2-edit{border:0;border-radius:8px;background:#e0f2fe;color:#075985;padding:6px 8px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap}
.qrv2-edit:hover{background:#bae6fd}
#qrv2Overlay{position:fixed;inset:0;z-index:490;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.62)}
#qrv2Overlay.open{display:flex}
#qrv2Box{width:min(620px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 25px 80px #0007;border-top:7px solid #0284c7}
#qrv2Box h2{margin:0 0 12px;color:#075985}
#qrv2Box label{display:block;font-size:12px;font-weight:900;color:#475569;margin:10px 0 5px}
#qrv2Box input,#qrv2Box textarea{width:100%;border:2px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit;background:#fff}
#qrv2Box textarea{min-height:120px;resize:vertical;line-height:1.4}
.qrv2-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.qrv2-fileinfo{margin-top:7px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:12px}
.qrv2-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
.qrv2-actions button{border:0;border-radius:9px;padding:9px 13px;font-weight:900;cursor:pointer}
.qrv2-cancel{background:#e2e8f0;color:#334155}.qrv2-save{background:#0284c7;color:#fff}
@media(max-width:720px){body.qr-page-open #quickRequests .qr-page-head{align-items:flex-start!important}body.qr-page-open #quickRequests .qr-new{width:auto!important}}
@media(max-width:560px){.qrv2-grid{grid-template-columns:1fr}.qrv2-actions button{flex:1}}
</style>
<script id="quickRequestPageCleanEditV2Script">
(function(){
'use strict';
if(window.__quickRequestPageCleanEditV2)return;
window.__quickRequestPageCleanEditV2=true;
var currentId=0,currentRow=null,newFile=null,busy=false,decorateTimer=null;
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function split(note){var raw=String(note||'').replace(/\r\n/g,'\n').trim(),lines=raw.split('\n');return {title:(lines.shift()||'').trim().replace(/^⚡\s+/,''),detail:lines.join('\n').trim()}}
async function api(path,opts){var r=await fetch(path,Object.assign({headers:{'cache-control':'no-cache'}},opts||{})),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
function toast(text){var el=document.getElementById('quickRequestToast');if(el){el.textContent=text;el.style.display='block';clearTimeout(window.__qrv2Toast);window.__qrv2Toast=setTimeout(function(){el.style.display='none'},2600)}else alert(text)}
function syncPage(){var section=document.getElementById('quickRequests');document.body.classList.toggle('qr-page-open',!!(section&&section.classList.contains('active')))}
function ensureEditor(){
 if(document.getElementById('qrv2Overlay'))return;
 var o=document.createElement('div');o.id='qrv2Overlay';o.innerHTML='<div id="qrv2Box" role="dialog" aria-modal="true"><h2>✏ Hızlı Talebi Düzenle</h2><label>MÜŞTERİ / BAŞLIK</label><input id="qrv2Title" autocomplete="off"><label>TALEP / NOT</label><textarea id="qrv2Detail"></textarea><div class="qrv2-grid"><div><label>TARİH</label><input id="qrv2Date" type="date"></div><div><label>ALARM SAATİ</label><input id="qrv2Time" type="time" step="300"></div></div><label>RESİM / PDF REVİZE</label><input id="qrv2File" type="file" accept=".pdf,image/jpeg,image/png,image/webp"><div id="qrv2FileInfo" class="qrv2-fileinfo">Yeni dosya seçmezsen mevcut dosya korunur.</div><div class="qrv2-actions"><button type="button" id="qrv2Cancel" class="qrv2-cancel">Vazgeç</button><button type="button" id="qrv2Save" class="qrv2-save">💾 Değişiklikleri Kaydet</button></div></div>';
 o.onclick=function(e){if(e.target===o)closeEditor()};document.body.appendChild(o);
 document.getElementById('qrv2Cancel').onclick=closeEditor;
 document.getElementById('qrv2Save').onclick=saveEditor;
 document.getElementById('qrv2File').onchange=function(){newFile=this.files&&this.files[0]||null;showFileInfo()}
}
function closeEditor(){document.getElementById('qrv2Overlay')?.classList.remove('open');currentId=0;currentRow=null;newFile=null;var f=document.getElementById('qrv2File');if(f)f.value=''}
function showFileInfo(existing){var el=document.getElementById('qrv2FileInfo');if(!el)return;if(newFile){el.textContent='Yeni dosya: '+newFile.name;return}if(existing){el.textContent='Mevcut dosya: '+existing.file_name+' — yeni dosya seçmezsen korunur.';return}el.textContent='Dosya yok. İstersen yeni resim veya PDF seçebilirsin.'}
async function findRow(id){var rows=await api('/api/agenda/active?from='+encodeURIComponent(today()));return (Array.isArray(rows)?rows:[]).find(function(x){return Number(x.id)===Number(id)})||null}
async function findFile(id){try{var rows=await api('/api/quick-request-files?ids='+encodeURIComponent(String(id)));return Array.isArray(rows)&&rows[0]?rows[0]:null}catch(_){return null}}
function timeValue(v){v=String(v||'');if(!v)return '';var m=v.match(/(?:T|\s)(\d{2}:\d{2})/)||v.match(/^(\d{2}:\d{2})/);return m?m[1]:''}
async function openEditor(id){ensureEditor();try{var row=await findRow(id);if(!row)return toast('Talep bulunamadı.');currentId=Number(id);currentRow=row;newFile=null;var p=split(row.note);document.getElementById('qrv2Title').value=p.title;document.getElementById('qrv2Detail').value=p.detail;document.getElementById('qrv2Date').value=row.entry_date||today();document.getElementById('qrv2Time').value=timeValue(row.remind_at);var f=document.getElementById('qrv2File');if(f)f.value='';showFileInfo(await findFile(id));document.getElementById('qrv2Overlay').classList.add('open')}catch(e){toast(e.message)}}
async function upload(id,file){var fd=new FormData();fd.append('file',file,file.name);var r=await fetch('/api/quick-request-file/'+id,{method:'POST',body:fd}),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Dosya yüklenemedi.');return d}
async function saveEditor(){if(busy||!currentId||!currentRow)return;var title=String(document.getElementById('qrv2Title')?.value||'').trim(),detail=String(document.getElementById('qrv2Detail')?.value||'').trim(),date=document.getElementById('qrv2Date')?.value||today(),time=document.getElementById('qrv2Time')?.value||'';if(!title)return toast('Başlık boş olamaz.');if(!detail)return toast('Talep / not boş olamaz.');if(newFile&&newFile.size>5*1024*1024)return toast('Dosya en fazla 5 MB olabilir.');busy=true;try{await api('/api/agenda/'+currentId,{method:'PUT',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify({entry_date:date,note:'⚡ '+title+'\n'+detail,remind_at:time?date+'T'+time:''})});if(newFile)await upload(currentId,newFile);closeEditor();toast('Talep güncellendi.');var menu=document.getElementById('quickRequestMenu');if(menu)setTimeout(function(){try{menu.click()}catch(_){}},80);if(typeof window.loadAgenda==='function')try{await window.loadAgenda()}catch(_){}}catch(e){toast(e.message)}finally{busy=false}}
function decorate(){document.querySelectorAll('#quickRequestList .qr-card').forEach(function(card){var done=card.querySelector('[data-qr-done]');if(!done)return;var id=Number(done.getAttribute('data-qr-done'));if(!id)return;if(card.querySelector('[data-qrv2-edit="'+id+'"]'))return;var b=document.createElement('button');b.type='button';b.className='qrv2-edit';b.dataset.qrv2Edit=String(id);b.textContent='✏ Düzenle';b.onclick=function(e){e.stopPropagation();openEditor(id)};var host=card.querySelector('.qrc-right')||done.parentElement;var del=host&&host.querySelector('.qrc-delete');if(host){if(del)host.insertBefore(b,del);else host.insertBefore(b,done)}})}
function apply(){syncPage();ensureEditor();decorate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,120)},{once:true});else setTimeout(apply,120);
new MutationObserver(function(){syncPage();clearTimeout(decorateTimer);decorateTimer=setTimeout(decorate,80)}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',function(){setTimeout(function(){syncPage();decorate()},0)},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeEditor()});
})();
</script>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx), backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestPageCleanEditV2Script'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',PATCH+'\n</body>'):html+PATCH;
      return rebuild(response,next);
    }catch(error){
      console.error('Quick request page clean edit v2 failed',error);
      return backup;
    }
  }
};
