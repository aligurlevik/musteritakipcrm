import worker from './agenda_popup_top.js';

const INJECT = String.raw`
<style id="agendaTitleOnlyStyle">
.done-note,.agenda-note,.month-day-note,.agenda-week-note,.noteText,.note-text{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.agenda-view-button{width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important;font-size:15px!important;line-height:1!important}
#list .body.has-detail-eye{position:relative;padding-right:34px!important}
#list .notes-detail-eye{position:absolute;right:2px;top:1px;width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:50%;background:#eaf4ff;color:#1769c2;padding:0;font-size:15px;line-height:1;z-index:5;cursor:pointer}
#list .notes-detail-eye:active{transform:scale(.94)}
</style>
<script id="agendaTitleOnlyScript">
(function(){
  if(window.__agendaTitleOnlyLoaded)return;
  window.__agendaTitleOnlyLoaded=true;

  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    var title=(lines.shift()||'').trim();
    var detail=lines.join('\n').trim();
    return {title:title||detail,detail:title?detail:''};
  }

  function findAgendaItem(id){
    var n=Number(id),lists=[];
    try{if(typeof agendaEntries!=='undefined'&&Array.isArray(agendaEntries))lists.push(agendaEntries)}catch(_){}
    try{if(typeof todayAgendaEntries!=='undefined'&&Array.isArray(todayAgendaEntries))lists.push(todayAgendaEntries)}catch(_){}
    for(var i=0;i<lists.length;i++){
      var item=lists[i].find(function(x){return Number(x.id)===n});
      if(item)return item;
    }
    return null;
  }

  function desktopFullNote(el){
    var id=Number(el.getAttribute('data-agenda-id'));
    var item=id?findAgendaItem(id):null;
    if(item&&item.note!=null)return String(item.note);
    if(el.dataset.fullAgendaNote)return el.dataset.fullAgendaNote;
    var current=String(el.textContent||'');
    el.dataset.fullAgendaNote=current;
    return current;
  }

  function applyDesktop(){
    document.querySelectorAll('.done-note,.agenda-note,.month-day-note,.agenda-week-note').forEach(function(el){
      if(el.closest('.agenda-inline-detail'))return;
      var parts=splitNote(desktopFullNote(el));
      if(parts.title&&String(el.textContent||'')!==parts.title)el.textContent=parts.title;
    });

    document.querySelectorAll('.agenda-view-button[data-agenda-id]').forEach(function(button){
      var id=Number(button.getAttribute('data-agenda-id'));
      var item=id?findAgendaItem(id):null;
      var full=item&&item.note!=null?String(item.note):'';
      if(!full){
        var title=document.querySelector('.agenda-title-click[data-agenda-id="'+id+'"]');
        if(title)full=desktopFullNote(title);
      }
      var hasDetail=!!splitNote(full).detail;
      button.style.display=hasDetail?'inline-flex':'none';
      if(hasDetail){
        button.textContent='👁️';
        button.title='Notun içini gör';
        button.setAttribute('aria-label','Notun içini gör');
      }
    });
  }

  function cardId(card){
    var body=card.querySelector('.body');
    var code=body?String(body.getAttribute('onclick')||''):'';
    var match=code.match(/openEditor\((\d+)/);
    if(match)return Number(match[1]);
    var cb=card.querySelector('input.check');
    code=cb?String(cb.getAttribute('onchange')||''):'';
    match=code.match(/setDone\((\d+)/);
    return match?Number(match[1]):0;
  }

  function applyNotesPage(){
    document.querySelectorAll('#list .card').forEach(function(card){
      var text=card.querySelector('.noteText,.note-text');
      var body=card.querySelector('.body')||card;
      if(!text||!body)return;

      if(!text.dataset.fullAgendaNote)text.dataset.fullAgendaNote=String(text.textContent||'');
      var parts=splitNote(text.dataset.fullAgendaNote);
      if(parts.title&&String(text.textContent||'')!==parts.title)text.textContent=parts.title;

      var hint=card.querySelector('.moreHint');
      if(hint)hint.remove();

      var eye=body.querySelector('.notes-detail-eye');
      if(!parts.detail){
        if(eye)eye.remove();
        body.classList.remove('has-detail-eye');
        return;
      }

      body.classList.add('has-detail-eye');
      if(eye)return;
      var id=cardId(card);
      if(!id)return;
      eye=document.createElement('button');
      eye.type='button';
      eye.className='notes-detail-eye';
      eye.textContent='👁️';
      eye.title='Notun içini gör';
      eye.setAttribute('aria-label','Notun içini gör');
      eye.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        if(typeof window.openEditor==='function')window.openEditor(id);
        else if(typeof window.openEditNote==='function')window.openEditNote(id);
      });
      body.appendChild(eye);
    });
  }

  function apply(){applyDesktop();applyNotesPage()}
  var scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(function(){scheduled=false;apply()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',schedule,true);
  setInterval(apply,800);
})();
</script>`;

function rebuilt(response,html){
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
    const copy=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(html.includes('agendaTitleOnlyScript'))return rebuilt(response,html);
      const next=html.includes('</body>')?html.replace('</body>',INJECT+'\n</body>'):html+INJECT;
      return rebuilt(response,next);
    }catch(error){
      console.error('Agenda title-only injection failed',error);
      return copy;
    }
  }
};
