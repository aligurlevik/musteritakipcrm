import worker from './quick_request_sort_safe.js';

const QUICK_REQUEST_PAGE_CLEAN = String.raw`
<style id="quickRequestPageCleanSafeStyle">
/* Hızlı Talepler sayfasında genel üst butonları gizle */
body.qr-page-open .top>div:last-child{display:none!important}

/* + Hızlı Talep butonunu sayfanın sol tarafına al */
body.qr-page-open #quickRequests .qr-page-head{justify-content:flex-start!important;align-items:center!important;gap:12px!important}
body.qr-page-open #quickRequests .qr-page-head>div{order:2!important}
body.qr-page-open #quickRequests .qr-new{order:1!important;margin:0!important;flex:0 0 auto!important}

@media(max-width:720px){
  body.qr-page-open #quickRequests .qr-page-head{align-items:flex-start!important}
  body.qr-page-open #quickRequests .qr-new{width:auto!important}
}
</style>
<script id="quickRequestPageCleanSafeScript">
(function(){
'use strict';
if(window.__quickRequestPageCleanSafe)return;
window.__quickRequestPageCleanSafe=true;

function sync(){
  var section=document.getElementById('quickRequests');
  document.body.classList.toggle('qr-page-open',!!(section&&section.classList.contains('active')));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,80)},{once:true});else setTimeout(sync,80);
new MutationObserver(sync).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',function(){setTimeout(sync,0)},true);
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
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestPageCleanSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_PAGE_CLEAN+'\n</body>'):html+QUICK_REQUEST_PAGE_CLEAN;
      return rebuild(response,next);
    }catch(error){console.error('Quick request page clean patch failed',error);return backup}
  }
};
