import worker from './production_guard.js';

const DESKTOP_AGENDA_EYE = String.raw`
<style id="desktopAgendaEyeSafeStyle">
@media (min-width:900px){
  #agenda .agenda-safe-eye{display:none!important}
  #agenda .agenda-safe-detail-inline{display:block;margin:5px 0 0 0;font-size:15px;line-height:1.35;font-weight:600;color:#1f2937;white-space:pre-wrap;overflow-wrap:anywhere}
}
</style>
<script id="desktopAgendaEyeSafeScript">
(function(){
  if(window.__desktopAgendaEyeSafe)return;
  window.__desktopAgendaEyeSafe=true;

  function isDesktop(){return !!(window.matchMedia&&window.matchMedia('(min-width:900px)').matches)}
  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    if(lines.length>1){
      var title=(lines.shift()||'').trim();
      var detail=lines.join('\n').replace(/^\s+/,'').trim();
      return {title:title||detail,detail:title?detail:''};
    }
    var paren=raw.match(/^(.{2,60}?)\s*\((.+)\)\s*$/s);
    if(paren)return {title:paren[1].trim(),detail:paren[2].trim()};
    return {title:raw,detail:''};
  }

  function processMainNote(el){
    if(!isDesktop()||!el)return;
    var raw=el.dataset.agendaSafeFullNote;
    if(!raw){raw=String(el.textContent||'');el.dataset.agendaSafeFullNote=raw}
    var parts=splitNote(raw);
    if(parts.title)el.textContent=parts.title;
    var parent=el.parentElement;if(!parent)return;
    parent.querySelectorAll('.agenda-safe-eye').forEach(function(x){x.remove()});
    var detail=parent.querySelector('.agenda-safe-detail-inline');
    if(!parts.detail){if(detail)detail.remove();return}
    if(!detail){detail=document.createElement('div');detail.className='agenda-safe-detail-inline';el.insertAdjacentElement('afterend',detail)}
    detail.textContent=parts.detail;
  }

  function firstLineOnly(el){
    if(!el)return;
    var raw=String(el.textContent||'');
    var first=(raw.replace(/\r\n/g,'\n').split('\n')[0]||'').trim();
    if(first&&raw!==first)el.textContent=first;
  }

  function hideDesktopExtraNotebooks(){
    if(!isDesktop())return;
    document.querySelectorAll('a,button,[role="button"]').forEach(function(el){
      var text=String(el.textContent||'').replace(/\s+/g,' ').trim().toLocaleUpperCase('tr-TR');
      if(text==='NOT 2'||text==='NOT 3')el.style.setProperty('display','none','important');
    });
  }

  function apply(){
    if(!isDesktop())return;
    document.querySelectorAll('.done-note,.agenda-note').forEach(processMainNote);
    document.querySelectorAll('.month-day-note,.agenda-week-note').forEach(firstLineOnly);
    hideDesktopExtraNotebooks();
  }

  var original=window.renderAgenda;
  if(typeof original==='function'){
    window.renderAgenda=function(){var result=original.apply(this,arguments);setTimeout(apply,0);return result};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0)},{once:true});
  else setTimeout(apply,0);
  setTimeout(apply,700);
  window.addEventListener('resize',function(){setTimeout(apply,80)});
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
    const response=await worker.fetch(request,env,ctx);const backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('id="agendaDays"')||html.includes('desktopAgendaEyeSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',DESKTOP_AGENDA_EYE+'\n</body>'):html+DESKTOP_AGENDA_EYE;
      return rebuild(response,next);
    }catch(error){console.error('Desktop agenda patch failed',error);return backup}
  }
};
