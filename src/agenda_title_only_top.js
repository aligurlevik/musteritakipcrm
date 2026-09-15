import worker from './agenda_popup_top.js';

const INJECT = String.raw`
<style id="agendaTitleOnlyStyle">
.done-note,.agenda-note,.month-day-note,.agenda-week-note,.note-text,.noteText{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.agenda-view-button{width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important;font-size:16px!important}
.note-card .note-main{padding-right:40px}
.mobile-note-view-button{position:absolute;right:8px;top:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin:0;border:0;border-radius:50%;background:#ffffffd9;color:#1e3a8a;padding:0;font-size:17px;line-height:1;box-shadow:0 1px 5px #0002}
.mobile-note-view-button:active{transform:scale(.94)}
.notes-detail-eye{position:absolute;right:2px;top:1px;width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:50%;background:#eef6ff;color:#1e3a8a;font-size:15px;line-height:1;padding:0}
.body.has-detail-eye{position:relative;padding-right:34px!important}
</style>
<script id="agendaTitleOnlyScript">
(function(){
  if(window.__agendaTitleOnlyLoaded)return;
  window.__agendaTitleOnlyLoaded=true;

  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    if(lines.length>1){
      var title=(lines.shift()||'').trim();
      var detail=lines.join('\n').trim();
      return {title:title||detail,detail:title?detail:''};
    }
    var paren=raw.match(/^(.{2,60}?)\s*\((.+)\)\s*$/s);
    if(paren)return {title:paren[1].trim(),detail:paren[2].trim()};
    return {title:raw,detail:''};
  }
  function firstLine(value){return splitNote(value).title}

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

  function applyDesktop(){
    document.querySelectorAll('.done-note,.agenda-note,.month-day-note,.agenda-week-note').forEach(function(el){
      if(el.closest('.agenda-inline-detail'))return;
      var current=String(el.textContent||'');
      var title=firstLine(current);
      if(title&&current!==title)el.textContent=title;
    });
    document.querySelectorAll('.agenda-view-button[data-agenda-id]').forEach(function(button){
      var id=Number(button.getAttribute('data-agenda-id'));
      var item=findAgendaItem(id);
      if(!item)return;
      var hasDetail=!!splitNote(item.note).detail;
      button.style.display=hasDetail?'inline-flex':'none';
      if(hasDetail){
        button.textContent='👁️';
        button.title='Notun içini gör';
        button.setAttribute('aria-label','Notun içini gör');
      }
    });
  }

  function applyLegacyMobile(){
    document.querySelectorAll('.note-card').forEach(function(card){
      var text=card.querySelector('.note-text');
      if(!text)return;
      if(!card.dataset.fullAgendaNote)card.dataset.fullAgendaNote=String(text.textContent||'');
      var parts=splitNote(card.dataset.fullAgendaNote);
      if(parts.title)text.textContent=parts.title;
      var onclick=card.getAttribute('onclick')||'';
      var match=onclick.match(/openEditNote\((\d+)\)/);
      if(!match)return;
      var id=Number(match[1]);
      var old=card.querySelector('.mobile-note-view-button');
      if(!parts.detail){if(old)old.remove();return}
      if(old)return;
      var button=document.createElement('button');
      button.type='button';
      button.className='mobile-note-view-button';
      button.textContent='👁️';
      button.setAttribute('aria-label','Notun içini gör');
      button.title='Notun içini gör';
      button.addEventListener('click',function(event){
        event.preventDefault();event.stopPropagation();
        if(typeof window.openEditNote==='function')window.openEditNote(id);
      });
      card.appendChild(button);
    });
  }

  var noteRows=new Map(),noteBusy=false,noteLast=0;
  function noteScope(){return document.getElementById('tab-archive')&&document.getElementById('tab-archive').classList.contains('on')?'archive':'all'}
  function noteParts(row){
    if(!row)return {title:'',detail:''};
    var title=String(row.title||'').trim();
    var note=String(row.note||'').trim();
    if(title){
      if(!note||note===title)return {title:title,detail:''};
      if(note.indexOf(title+'\n')===0)return {title:title,detail:note.slice(title.length).trim()};
      return {title:title,detail:note};
    }
    return splitNote(note);
  }
  function cardId(card){
    var cb=card.querySelector('input.check');
    var code=cb?String(cb.getAttribute('onchange')||''):'';
    var m=code.match(/setDone\((\d+)/);
    return m?Number(m[1]):0;
  }
  function decorateNotlar(){
    document.querySelectorAll('#list .card').forEach(function(card){
      var id=cardId(card);if(!id)return;
      var row=noteRows.get(id);if(!row)return;
      var parts=noteParts(row),text=card.querySelector('.noteText'),body=card.querySelector('.body');
      if(text&&parts.title)text.textContent=parts.title;
      var hint=card.querySelector('.moreHint');if(hint)hint.remove();
      if(!body)return;
      var eye=body.querySelector('.notes-detail-eye');
      if(!parts.detail){if(eye)eye.remove();body.classList.remove('has-detail-eye');return}
      body.classList.add('has-detail-eye');
      if(eye)return;
      eye=document.createElement('button');
      eye.type='button';eye.className='notes-detail-eye';eye.textContent='👁️';eye.title='Notun içini gör';eye.setAttribute('aria-label','Notun içini gör');
      eye.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();if(typeof window.openEditor==='function')window.openEditor(id)});
      body.appendChild(eye);
    });
  }
  async function refreshNotlar(){
    if(!document.querySelector('#list .card .noteText'))return;
    var now=Date.now();decorateNotlar();
    if(noteBusy||now-noteLast<2500)return;
    noteBusy=true;
    try{
      var r=await fetch('/api/notes-v3?scope='+encodeURIComponent(noteScope()),{headers:{'cache-control':'no-cache'}});
      if(r.ok){
        var rows=await r.json();
        if(Array.isArray(rows)){noteRows=new Map(rows.map(function(x){return [Number(x.id),x]}));noteLast=Date.now();decorateNotlar()}
      }
    }catch(_){}finally{noteBusy=false}
  }

  function apply(){applyDesktop();applyLegacyMobile();refreshNotlar()}

  var scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(function(){scheduled=false;apply()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',schedule,true);
  setInterval(apply,1000);
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
