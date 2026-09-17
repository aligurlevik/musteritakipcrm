import worker from './quick_request_schedule_safe.js';

const QUICK_REQUEST_COMPACT = String.raw`
<style id="quickRequestCompactSafeStyle">
/* Hızlı Talepler: 10+ kayıt ekranda rahat görünsün */
#quickRequestList{gap:6px!important}
#quickRequestList .qr-card{padding:7px 10px!important;min-height:58px!important;border-radius:10px!important}
#quickRequestList .qr-card-top{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important}
#quickRequestList .qr-card-top>div:first-child{min-width:0!important}
#quickRequestList .qr-title{font-size:14px!important;line-height:1.15!important;margin:0!important}
#quickRequestList .qr-detail{font-size:12.5px!important;line-height:1.25!important;margin-top:2px!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important;max-height:2.5em!important}
#quickRequestList .qr-meta{display:none!important}
#quickRequestList .qr2-file{margin-top:4px!important;padding:3px 7px!important;font-size:11px!important}
#quickRequestList .qrc-right{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;white-space:nowrap!important}
#quickRequestList .qrc-right .qrs-badge{margin:0!important;padding:5px 7px!important;font-size:11px!important;white-space:nowrap!important}
#quickRequestList .qrc-right .qr-done{padding:7px 9px!important;font-size:12px!important;margin:0!important}

/* Bugün tamamlananlar da küçük kartlar halinde kalsın */
#quickRequestCompletedV2{margin-top:14px!important}
#quickRequestCompletedV2 h3{margin-bottom:6px!important}
#quickRequestCompletedV2 .qr2-completed-list{gap:6px!important}
#quickRequestCompletedV2 .qr2-card{padding:7px 10px!important;border-radius:10px!important}
#quickRequestCompletedV2 .qr2-card-top{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important}
#quickRequestCompletedV2 .qr2-title{font-size:13px!important;line-height:1.15!important}
#quickRequestCompletedV2 .qr2-detail{font-size:12px!important;line-height:1.2!important;margin-top:2px!important;display:-webkit-box!important;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden!important}
#quickRequestCompletedV2 .qr2-meta{font-size:10px!important;margin-top:3px!important}
#quickRequestCompletedV2 .qr2-file{margin-top:4px!important;padding:3px 7px!important;font-size:10px!important}
#quickRequestCompletedV2 .qr2-undo{padding:6px 8px!important;font-size:11px!important}

@media(max-width:760px){
  #quickRequestList .qr-card-top{grid-template-columns:minmax(0,1fr)!important}
  #quickRequestList .qrc-right{justify-content:space-between!important;margin-top:4px!important}
  #quickRequestCompletedV2 .qr2-card-top{grid-template-columns:minmax(0,1fr)!important}
}
</style>
<script id="quickRequestCompactSafeScript">
(function(){
  'use strict';
  if(window.__quickRequestCompactSafe)return;
  window.__quickRequestCompactSafe=true;

  function compactWaitingCards(){
    document.querySelectorAll('#quickRequestList .qr-card .qr-card-top').forEach(function(top){
      var done=top.querySelector('.qr-done');
      if(!done)return;
      var right=top.querySelector('.qrc-right');
      if(!right){
        right=document.createElement('div');
        right.className='qrc-right';
        done.insertAdjacentElement('beforebegin',right);
        right.appendChild(done);
      }
      var badge=top.querySelector('[data-qrs-badge]');
      if(badge&&badge.parentElement!==right)right.insertBefore(badge,done);
    });
  }

  function apply(){compactWaitingCards()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,120)},{once:true});else setTimeout(apply,120);
  var timer;
  new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(apply,100)}).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(apply,30000);
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
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestCompactSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_COMPACT+'\n</body>'):html+QUICK_REQUEST_COMPACT;
      return rebuild(response,next);
    }catch(error){console.error('Quick request compact patch failed',error);return backup}
  }
};
