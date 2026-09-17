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
.qrc-delete{border:0;border-radius:8px;background:#fee2e2;color:#b91c1c;padding:7px 9px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}
.qrc-delete:hover{background:#fecaca}

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
#quickRequestCompletedV2 .qr2-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}
#quickRequestCompletedV2 .qr2-undo{padding:6px 8px!important;font-size:11px!important}
#quickRequestCompletedV2 .qrc-delete{padding:6px 8px!important;font-size:11px!important}

@media(max-width:760px){
  #quickRequestList .qr-card-top{grid-template-columns:minmax(0,1fr)!important}
  #quickRequestList .qrc-right{justify-content:space-between!important;margin-top:4px!important}
  #quickRequestCompletedV2 .qr2-card-top{grid-template-columns:minmax(0,1fr)!important}
  #quickRequestCompletedV2 .qr2-actions{justify-content:flex-start!important}
}
</style>
<script id="quickRequestCompactSafeScript">
(function(){
  'use strict';
  if(window.__quickRequestCompactSafe)return;
  window.__quickRequestCompactSafe=true;

  function toast(text){var el=document.getElementById('quickRequestToast');if(el){el.textContent=text;el.style.display='block';clearTimeout(window.__qrcToast);window.__qrcToast=setTimeout(function(){el.style.display='none'},2600)}else alert(text)}
  async function deleteQuick(id,card){
    if(!confirm('Bu hızlı talep tamamen silinsin mi?'))return;
    try{
      var r=await fetch('/api/agenda/'+id,{method:'DELETE',headers:{'cache-control':'no-cache'}}),d={};try{d=await r.json()}catch(_){}
      if(!r.ok)throw new Error(d.error||'Talep silinemedi.');
      card?.remove();toast('Hızlı talep silindi.');
      var menu=document.getElementById('quickRequestMenu');if(menu)setTimeout(function(){try{menu.click()}catch(_){}},80);
    }catch(e){toast(e.message||'Talep silinemedi.')}
  }

  function makeDelete(id,card){
    var b=document.createElement('button');b.type='button';b.className='qrc-delete';b.textContent='🗑 Sil';b.dataset.qrcDelete=String(id);b.onclick=function(e){e.stopPropagation();deleteQuick(id,card)};return b;
  }

  function compactWaitingCards(){
    document.querySelectorAll('#quickRequestList .qr-card .qr-card-top').forEach(function(top){
      var done=top.querySelector('.qr-done');
      if(!done)return;
      var id=Number(done.getAttribute('data-qr-done')),card=top.closest('.qr-card');
      var right=top.querySelector('.qrc-right');
      if(!right){
        right=document.createElement('div');
        right.className='qrc-right';
        done.insertAdjacentElement('beforebegin',right);
        right.appendChild(done);
      }
      var badge=top.querySelector('[data-qrs-badge]');
      if(badge&&badge.parentElement!==right)right.insertBefore(badge,done);
      if(id&&!right.querySelector('[data-qrc-delete="'+id+'"]'))right.appendChild(makeDelete(id,card));
    });
  }

  function compactCompletedCards(){
    document.querySelectorAll('#quickRequestCompletedV2 .qr2-card .qr2-card-top').forEach(function(top){
      var undo=top.querySelector('.qr2-undo');if(!undo)return;
      var id=Number(undo.getAttribute('data-qr2-undo')),card=top.closest('.qr2-card');
      var actions=top.querySelector('.qr2-actions');
      if(!actions){actions=document.createElement('div');actions.className='qr2-actions';undo.insertAdjacentElement('beforebegin',actions);actions.appendChild(undo)}
      if(id&&!actions.querySelector('[data-qrc-delete="'+id+'"]'))actions.appendChild(makeDelete(id,card));
    });
  }

  function apply(){compactWaitingCards();compactCompletedCards()}
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
      const url=new URL(request.url);
      const deleted=url.pathname.match(/^\/api\/agenda\/(\d+)$/);
      if(request.method==='DELETE'&&deleted&&response.ok){
        try{await env.DB.prepare('DELETE FROM quick_request_files WHERE agenda_id=?').bind(Number(deleted[1])).run()}catch(_){}
      }
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestCompactSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_COMPACT+'\n</body>'):html+QUICK_REQUEST_COMPACT;
      return rebuild(response,next);
    }catch(error){console.error('Quick request compact patch failed',error);return backup}
  }
};
