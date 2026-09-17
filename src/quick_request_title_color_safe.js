import worker from './quick_request_compact_safe.js';

const TITLE_COLOR_PATCH = String.raw`
<style id="quickRequestTitleColorSafeStyle">
#quickRequestList .qr-card{min-height:42px!important;padding:6px 10px!important}
#quickRequestList .qr-detail,#quickRequestList .qr-meta,#quickRequestList .qr2-file{display:none!important}
#quickRequestList .qr-title{
  display:inline-block!important;color:#1d4ed8!important;background:#dbeafe!important;border:1px solid #bfdbfe!important;border-radius:7px!important;padding:2px 7px!important;font-weight:950!important;cursor:pointer!important;user-select:none
}
#quickRequestList .qr-title:after{content:'  ›';font-weight:900;opacity:.65}
#quickRequestCompletedV2 .qr2-card{min-height:40px!important;padding:6px 10px!important}
#quickRequestCompletedV2 .qr2-detail,#quickRequestCompletedV2 .qr2-meta,#quickRequestCompletedV2 .qr2-file{display:none!important}
#quickRequestCompletedV2 .qr2-title{
  display:inline-block!important;color:#7e22ce!important;background:#f3e8ff!important;border:1px solid #e9d5ff!important;border-radius:7px!important;padding:2px 7px!important;font-weight:950!important;cursor:pointer!important;user-select:none
}
#quickRequestCompletedV2 .qr2-title:after{content:'  ›';font-weight:900;opacity:.65}
#qrTitleOnlyOverlay{position:fixed;inset:0;z-index:430;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.62)}
#qrTitleOnlyOverlay.open{display:flex}
#qrTitleOnlyBox{width:min(560px,94vw);max-height:86vh;overflow:auto;background:#fff;border-radius:15px;padding:18px;box-shadow:0 24px 70px #0006;border-top:6px solid #2563eb}
#qrTitleOnlyBox h3{margin:0 0 12px;color:#1d4ed8;font-size:18px}
#qrTitleOnlyDetail{white-space:pre-wrap;line-height:1.5;color:#1f2937;font-size:14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}
#qrTitleOnlyMeta{margin-top:10px;color:#64748b;font-size:12px}
#qrTitleOnlyFiles{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
#qrTitleOnlyFiles a{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:8px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:12px;font-weight:900;border:1px solid #bfdbfe}
#qrTitleOnlyClose{margin-top:14px;border:0;border-radius:9px;background:#e2e8f0;color:#334155;padding:9px 13px;font-weight:900;cursor:pointer}
</style>
<script id="quickRequestTitleOnlySafeScript">
(function(){
'use strict';if(window.__quickRequestTitleOnlySafe)return;window.__quickRequestTitleOnlySafe=true;
function ensureOverlay(){if(document.getElementById('qrTitleOnlyOverlay'))return;var o=document.createElement('div');o.id='qrTitleOnlyOverlay';o.innerHTML='<div id="qrTitleOnlyBox" role="dialog" aria-modal="true"><h3 id="qrTitleOnlyTitle"></h3><div id="qrTitleOnlyDetail"></div><div id="qrTitleOnlyMeta"></div><div id="qrTitleOnlyFiles"></div><button type="button" id="qrTitleOnlyClose">Kapat</button></div>';o.onclick=function(e){if(e.target===o)o.classList.remove('open')};document.body.appendChild(o);document.getElementById('qrTitleOnlyClose').onclick=function(){o.classList.remove('open')}}
function openCard(t){ensureOverlay();var c=t.closest('.qr-card,.qr2-card');if(!c)return;document.getElementById('qrTitleOnlyTitle').textContent=t.textContent.replace(/›\s*$/,'').trim();document.getElementById('qrTitleOnlyDetail').textContent=c.querySelector('.qr-detail,.qr2-detail')?.textContent?.trim()||'Ayrıntı yok.';var badge=c.querySelector('.qrs-badge')?.textContent?.trim()||'',meta=c.querySelector('.qr-meta,.qr2-meta')?.textContent?.trim()||'';document.getElementById('qrTitleOnlyMeta').textContent=[badge,meta].filter(Boolean).join(' • ');var fw=document.getElementById('qrTitleOnlyFiles');fw.innerHTML='';c.querySelectorAll('a.qr2-file').forEach(function(a){var x=document.createElement('a');x.href=a.href;x.target='_blank';x.rel='noopener';x.textContent=a.textContent;fw.appendChild(x)});document.getElementById('qrTitleOnlyOverlay').classList.add('open')}
document.addEventListener('click',function(e){var t=e.target.closest('#quickRequestList .qr-title,#quickRequestCompletedV2 .qr2-title');if(!t)return;e.stopPropagation();openCard(t)});document.addEventListener('keydown',function(e){if(e.key==='Escape')document.getElementById('qrTitleOnlyOverlay')?.classList.remove('open')});ensureOverlay();
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
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestTitleOnlySafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',TITLE_COLOR_PATCH+'\n</body>'):html+TITLE_COLOR_PATCH;
      return rebuild(response,next);
    }catch(error){console.error('Quick request title only patch failed',error);return backup}
  }
};
