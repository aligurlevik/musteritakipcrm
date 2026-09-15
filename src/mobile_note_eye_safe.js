import worker from './agenda_day_colors_safe.js';

const MOBILE_NOTE_EYE = String.raw`
<style id="mobileNoteEyeSafeStyle">
#list .noteText{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;max-height:none!important}
#list .body.mobile-note-has-detail{position:relative;padding-right:34px!important}
#list .mobile-note-eye-safe{position:absolute;right:2px;top:1px;width:28px;height:28px;border:0;border-radius:50%;background:#eaf4ff;color:#1769c2;display:grid;place-items:center;padding:0;font-size:15px;line-height:1;z-index:6;cursor:pointer}
#list .mobile-note-eye-safe:active{transform:scale(.94)}
</style>
<script id="mobileNoteEyeSafeScript">
(function(){
  if(window.__mobileNoteEyeSafe)return;
  window.__mobileNoteEyeSafe=true;

  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    var title=(lines.shift()||'').trim();
    var detail=lines.join('\n').trim();
    return {title:title||detail,detail:title?detail:''};
  }

  function itemId(card){
    var body=card.querySelector('.body');
    var code=body?String(body.getAttribute('onclick')||''):'';
    var m=code.match(/openEditor\((\d+)/);
    if(m)return Number(m[1]);
    var cb=card.querySelector('input.check');
    code=cb?String(cb.getAttribute('onchange')||''):'';
    m=code.match(/setDone\((\d+)/);
    return m?Number(m[1]):0;
  }

  function applyCard(card){
    var text=card.querySelector('.noteText');
    var body=card.querySelector('.body');
    if(!text||!body)return;

    var full=text.dataset.mobileFullNote;
    if(!full){
      full=String(text.textContent||'');
      text.dataset.mobileFullNote=full;
    }

    var parts=splitNote(full);
    if(parts.title&&text.textContent!==parts.title)text.textContent=parts.title;

    var hint=card.querySelector('.moreHint');
    if(hint)hint.remove();

    var eye=body.querySelector('.mobile-note-eye-safe');
    if(!parts.detail){
      if(eye)eye.remove();
      body.classList.remove('mobile-note-has-detail');
      return;
    }

    body.classList.add('mobile-note-has-detail');
    if(eye)return;
    var id=itemId(card);
    if(!id)return;

    eye=document.createElement('button');
    eye.type='button';
    eye.className='mobile-note-eye-safe';
    eye.textContent='👁️';
    eye.title='Notun içini gör';
    eye.setAttribute('aria-label','Notun içini gör');
    eye.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      if(typeof window.openEditor==='function')window.openEditor(id);
    });
    body.appendChild(eye);
  }

  function apply(){
    var list=document.getElementById('list');
    if(!list)return;
    list.querySelectorAll('.card').forEach(applyCard);
  }

  function start(){
    var list=document.getElementById('list');
    if(!list)return;
    apply();
    var queued=false;
    new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){queued=false;apply()});
    }).observe(list,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('<title>Notlarım</title>')||!html.includes('id="list"')||html.includes('mobileNoteEyeSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',MOBILE_NOTE_EYE+'\n</body>'):html+MOBILE_NOTE_EYE;
      return rebuild(response,next);
    }catch(error){
      console.error('Mobile note eye patch failed',error);
      return backup;
    }
  }
};
