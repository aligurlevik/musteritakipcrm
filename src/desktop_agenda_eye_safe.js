import worker from './production_guard.js';

const DESKTOP_AGENDA_EYE = String.raw`
<style id="desktopAgendaEyeSafeStyle">
.agenda-safe-eye{margin-left:7px;width:28px;height:28px;min-height:28px;padding:0;border:1px solid #93c5fd;border-radius:50%;background:#eff6ff;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;vertical-align:middle}
.agenda-safe-eye:hover{background:#dbeafe}
#agendaSafeDetailOverlay{position:fixed;inset:0;z-index:260;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.58)}
#agendaSafeDetailOverlay.open{display:flex}
#agendaSafeDetailBox{width:min(620px,94vw);max-height:84vh;overflow:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 24px 70px rgba(15,23,42,.38);border-left:6px solid #2563eb}
#agendaSafeDetailTitle{font-size:18px;font-weight:900;color:#0f172a;margin:0 0 10px}
#agendaSafeDetailText{white-space:pre-wrap;line-height:1.6;font-size:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:13px;min-height:70px}
#agendaSafeDetailClose{margin-top:14px;float:right;border:0;border-radius:8px;padding:9px 13px;background:#e2e8f0;color:#0f172a;font-weight:800;cursor:pointer}
</style>
<script id="desktopAgendaEyeSafeScript">
(function(){
  if(window.__desktopAgendaEyeSafe)return;
  window.__desktopAgendaEyeSafe=true;

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

  function ensureOverlay(){
    var overlay=document.getElementById('agendaSafeDetailOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='agendaSafeDetailOverlay';
    overlay.innerHTML='<div id="agendaSafeDetailBox" role="dialog" aria-modal="true"><div id="agendaSafeDetailTitle"></div><div id="agendaSafeDetailText"></div><button id="agendaSafeDetailClose" type="button">Kapat</button><div style="clear:both"></div></div>';
    document.body.appendChild(overlay);
    document.getElementById('agendaSafeDetailClose').addEventListener('click',closeDetail);
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeDetail()});
    return overlay;
  }

  function openDetail(parts){
    var overlay=ensureOverlay();
    document.getElementById('agendaSafeDetailTitle').textContent=parts.title||'Not';
    document.getElementById('agendaSafeDetailText').textContent=parts.detail||'';
    overlay.classList.add('open');
  }
  function closeDetail(){
    var overlay=document.getElementById('agendaSafeDetailOverlay');
    if(overlay)overlay.classList.remove('open');
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetail()});

  function processMainNote(el){
    if(!el||el.closest('#agendaSafeDetailOverlay'))return;
    var raw=el.dataset.agendaSafeFullNote;
    if(!raw){
      raw=String(el.textContent||'');
      el.dataset.agendaSafeFullNote=raw;
    }
    var parts=splitNote(raw);
    if(parts.title)el.textContent=parts.title;

    var parent=el.parentElement;
    if(!parent)return;
    var eye=parent.querySelector('.agenda-safe-eye');
    if(!parts.detail){if(eye)eye.remove();return}
    if(!eye){
      eye=document.createElement('button');
      eye.type='button';
      eye.className='agenda-safe-eye';
      eye.textContent='👁️';
      eye.title='Notun içini gör';
      eye.setAttribute('aria-label','Notun içini gör');
      eye.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openDetail(parts)});
      el.insertAdjacentElement('afterend',eye);
    }
  }

  function firstLineOnly(el){
    if(!el)return;
    var raw=String(el.textContent||'');
    var first=(raw.replace(/\r\n/g,'\n').split('\n')[0]||'').trim();
    if(first&&raw!==first)el.textContent=first;
  }

  function apply(){
    document.querySelectorAll('.done-note,.agenda-note').forEach(processMainNote);
    document.querySelectorAll('.month-day-note,.agenda-week-note').forEach(firstLineOnly);
  }

  var original=window.renderAgenda;
  if(typeof original==='function'){
    window.renderAgenda=function(){
      var result=original.apply(this,arguments);
      setTimeout(apply,0);
      return result;
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0)},{once:true});
  else setTimeout(apply,0);
  setTimeout(apply,700);
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
      if(!html.includes('id="agendaDays"')||html.includes('desktopAgendaEyeSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',DESKTOP_AGENDA_EYE+'\n</body>'):html+DESKTOP_AGENDA_EYE;
      return rebuild(response,next);
    }catch(error){
      console.error('Desktop agenda eye patch failed',error);
      return backup;
    }
  }
};
