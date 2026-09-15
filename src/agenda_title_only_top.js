import worker from './agenda_popup_top.js';

const INJECT = String.raw`
<style id="agendaTitleOnlyStyle">
.done-note,.agenda-note,.month-day-note,.agenda-week-note,.note-text,.noteText{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.agenda-view-button{width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;border-radius:50%!important}
.note-card.has-note-eye .note-main{padding-right:40px}
.mobile-note-view-button{position:absolute;right:8px;top:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin:0;border:0;border-radius:50%;background:#ffffffd9;color:#1e3a8a;padding:0;font-size:17px;line-height:1;box-shadow:0 1px 5px #0002}
.mobile-note-view-button:active{transform:scale(.94)}
.card.has-note-eye .body{position:relative;padding-right:34px!important}
.card .notes-v2-eye{right:2px;top:1px;width:28px;height:28px;font-size:15px;box-shadow:none;background:#eef6ff}
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
  function findAgendaItemForEye(id){
    var n=Number(id),lists=[];
    try{if(typeof agendaEntries!=='undefined'&&Array.isArray(agendaEntries))lists.push(agendaEntries)}catch(_){}
    try{if(typeof todayAgendaEntries!=='undefined'&&Array.isArray(todayAgendaEntries))lists.push(todayAgendaEntries)}catch(_){}
    for(var i=0;i<lists.length;i++){
      var item=lists[i].find(function(x){return Number(x.id)===n});
      if(item)return item;
    }
    return null;
  }
  function agendaHasDetail(id){var item=findAgendaItemForEye(id);return !!(item&&splitNote(item.note).detail)}

  function applyDesktop(){
    document.querySelectorAll('.done-note,.agenda-note,.month-day-note,.agenda-week-note').forEach(function(el){
      if(el.closest('.agenda-inline-detail'))return;
      var current=String(el.textContent||'');
      var title=firstLine(current);
      if(title&&current!==title)el.textContent=title;
    });
    document.querySelectorAll('.agenda-view-button[data-agenda-id]').forEach(function(button){
      var id=Number(button.getAttribute('data-agenda-id'));
      var show=agendaHasDetail(id);
      button.style.display=show?'inline-flex':'none';
      if(show){button.textContent='👁️';button.title='Notun içini gör';button.setAttribute('aria-label','Notun içini gör')}
    });
  }

  function ensureEyeButton(host,id,openFn,extraClass){
    var button=host.querySelector('.mobile-note-view-button');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='mobile-note-view-button'+(extraClass?' '+extraClass:'');
      button.textContent='👁️';
      button.setAttribute('aria-label','Notun içini gör');
      button.title='Notun içini gör';
      button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();openFn(id)});
      host.appendChild(button);
    }
    host.classList.add('has-note-eye');
  }
  function removeEyeButton(host){
    host.querySelector('.mobile-note-view-button')?.remove();
    host.classList.remove('has-note-eye');
  }

  function applyLegacyMobile(){
    document.querySelectorAll('.note-card').forEach(function(card){
      var text=card.querySelector('.note-text');
      if(!text)return;
      if(!card.dataset.fullAgendaNote)card.dataset.fullAgendaNote=String(text.textContent||'');
      var parts=splitNote(card.dataset.fullAgendaNote);
      if(parts.title)text.textContent=parts.title;
      var onclick=card.getAttribute('onclick')||'',match=onclick.match(/openEditNote\((\d+)\)/);
      if(!match)return;
      var id=Number(match[1]);
      if(parts.detail)ensureEyeButton(card,id,function(noteId){if(typeof window.openEditNote==='function')window.openEditNote(noteId)},'');
      else removeEyeButton(card);
    });
  }

  var notesV2Rows=new Map(),notesV2Scope='',notesV2Loading=false,notesV2LastFetch=0;
  function currentNotesV2Scope(){return document.getElementById('tab-archive')?.classList.contains('on')?'archive':'all'}
  function hasNotesV2Detail(row){
    if(!row)return false;
    var title=String(row.title||'').trim(),note=String(row.note||'').trim();
    return !!(title&&note&&note!==title);
  }
  function decorateNotesV2Cards(){
    document.querySelectorAll('#list .card').forEach(function(card){
      var cb=card.querySelector('input.check'),code=cb?.getAttribute('onchange')||'',match=code.match(/setDone\((\d+)/);
      if(!match)return;
      var id=Number(match[1]),row=notesV2Rows.get(id),text=card.querySelector('.noteText');
      if(row&&text){var title=String(row.title||'').trim()||firstLine(row.note);if(title)text.textContent=title}
      var body=card.querySelector('.body');if(!body)return;
      if(hasNotesV2Detail(row))ensureEyeButton(body,id,function(noteId){if(typeof window.openEditor==='function')window.openEditor(noteId)},'notes-v2-eye');
      else removeEyeButton(body);
    });
  }
  async function refreshNotesV2(){
    if(!document.querySelector('#list .card .noteText'))return;
    var scope=currentNotesV2Scope(),now=Date.now();
    decorateNotesV2Cards();
    if(notesV2Loading)return;
    if(scope===notesV2Scope&&now-notesV2LastFetch<2500)return;
    notesV2Loading=true;
    try{
      var response=await fetch('/api/notes-v3?scope='+encodeURIComponent(scope),{headers:{'cache-control':'no-cache'}});
      if(response.ok){var rows=await response.json();if(Array.isArray(rows)){notesV2Rows=new Map(rows.map(function(x){return [Number(x.id),x]}));notesV2Scope=scope;notesV2LastFetch=Date.now();decorateNotesV2Cards()}}
    }catch(_){}finally{notesV2Loading=false}
  }

  function apply(){applyDesktop();applyLegacyMobile();refreshNotesV2()}
  var scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(function(){scheduled=false;apply()})}

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
