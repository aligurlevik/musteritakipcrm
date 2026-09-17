import worker from './mobile_day_colors_safe.js';

const AGENDA_TITLE_DETAIL_LIVE = String.raw`
<style id="agendaTitleDetailLiveSafeStyle">
/* Eski göz düğmesini gizle; başlığın kendisi ayrıntıyı açar. */
#agenda .agenda-safe-eye{display:none!important}
#agenda .agenda-title-live{font-weight:850;cursor:pointer;border-radius:6px;padding:2px 4px;margin-left:-4px;display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
#agenda .agenda-title-live:hover{background:#dbeafe;color:#1d4ed8}
#agenda .agenda-title-live:after{content:'  ▸';font-size:11px;color:#64748b}
#agendaTitleDetailLiveOverlay{position:fixed;inset:0;z-index:320;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.58)}
#agendaTitleDetailLiveOverlay.open{display:flex}
#agendaTitleDetailLiveBox{width:min(680px,95vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 24px 70px rgba(15,23,42,.4);border-left:6px solid #2563eb}
#agendaTitleDetailLiveHeading{margin:0 0 12px;font-size:21px;color:#0f172a}
#agendaTitleDetailLiveText{white-space:pre-wrap;line-height:1.65;font-size:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;min-height:90px}
#agendaTitleDetailLiveText.empty{color:#94a3b8;font-style:italic}
#agendaTitleDetailLiveMeta{margin-top:9px;font-size:12px;color:#64748b}
#agendaTitleDetailLiveActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
#agendaTitleDetailLiveEdit{display:none;gap:9px}
#agendaTitleDetailLiveEdit.show{display:grid}
#agendaTitleDetailLiveView.hide{display:none}
#agendaTitleDetailLiveEdit label{font-size:12px;font-weight:900;color:#475569}
#agendaTitleDetailLiveEdit input,#agendaTitleDetailLiveEdit textarea{width:100%}
#agendaTitleDetailLiveEdit textarea{min-height:170px;resize:vertical;line-height:1.5}
#agenda .agenda-title-entry{grid-column:1/-1!important;display:grid;gap:4px}
#agenda .agenda-title-entry label{font-size:11px;font-weight:900;color:#475569}
#agenda .agenda-title-entry input{font-weight:900;border:2px solid #93c5fd;background:#fff}
#agenda .agenda-detail-entry{min-height:92px!important;resize:vertical;line-height:1.45;padding:9px!important}
#agenda .inline-agenda-add>div:has(.agenda-detail-entry){align-items:start}
</style>
<script id="agendaTitleDetailLiveSafeScript">
(function(){
  'use strict';
  if(window.__agendaTitleDetailLiveSafe)return;
  window.__agendaTitleDetailLiveSafe=true;

  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    var title=(lines.shift()||'').trim();
    var detail=lines.join('\n').replace(/^\s+/,'').trim();
    return {title:title||detail,detail:title?detail:''};
  }
  function combineNote(title,detail){
    title=String(title||'').trim();
    detail=String(detail||'').trim();
    return detail?title+'\n'+detail:title;
  }
  function escText(value){return String(value==null?'':value)}
  function findItem(id){
    var n=Number(id),lists=[];
    try{if(typeof agendaEntries!=='undefined'&&Array.isArray(agendaEntries))lists.push(agendaEntries)}catch(_){}
    try{if(typeof todayAgendaEntries!=='undefined'&&Array.isArray(todayAgendaEntries))lists.push(todayAgendaEntries)}catch(_){}
    for(var i=0;i<lists.length;i++){
      var found=lists[i].find(function(x){return Number(x.id)===n});
      if(found)return found;
    }
    return null;
  }
  function idFromElement(el){
    var m=String(el&&el.id||'').match(/-(\d+)$/);
    return m?Number(m[1]):0;
  }
  function formatMeta(item){
    var parts=[];
    if(item&&item.entry_date){
      try{parts.push('📅 '+new Date(item.entry_date+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}))}catch(_){}
    }
    if(item&&item.remind_at){
      try{parts.push('🔔 '+new Date(item.remind_at).toLocaleString('tr-TR'))}catch(_){}
    }
    return parts.join('   ');
  }

  function ensureOverlay(){
    var overlay=document.getElementById('agendaTitleDetailLiveOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='agendaTitleDetailLiveOverlay';
    overlay.innerHTML='<div id="agendaTitleDetailLiveBox" role="dialog" aria-modal="true">'+
      '<div id="agendaTitleDetailLiveView">'+
        '<h3 id="agendaTitleDetailLiveHeading"></h3>'+
        '<div id="agendaTitleDetailLiveText"></div>'+
        '<div id="agendaTitleDetailLiveMeta"></div>'+
        '<div id="agendaTitleDetailLiveActions"><button type="button" class="btn primary" id="agendaTitleDetailLiveEditBtn">✏️ Düzenle</button><button type="button" class="btn" id="agendaTitleDetailLiveCloseBtn">Kapat</button></div>'+
      '</div>'+
      '<div id="agendaTitleDetailLiveEdit">'+
        '<label>BAŞLIK</label><input id="agendaTitleDetailLiveEditTitle" type="text" autocomplete="off">'+
        '<label>NOT / MADDELER</label><textarea id="agendaTitleDetailLiveEditDetail" placeholder="Her maddeyi ayrı satıra yazabilirsiniz"></textarea>'+
        '<div id="agendaTitleDetailLiveActions"><button type="button" class="btn green" id="agendaTitleDetailLiveSaveBtn">Kaydet</button><button type="button" class="btn" id="agendaTitleDetailLiveCancelBtn">Vazgeç</button></div>'+
      '</div>'+
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeOverlay()});
    document.getElementById('agendaTitleDetailLiveCloseBtn').addEventListener('click',closeOverlay);
    document.getElementById('agendaTitleDetailLiveEditBtn').addEventListener('click',startEdit);
    document.getElementById('agendaTitleDetailLiveCancelBtn').addEventListener('click',cancelEdit);
    document.getElementById('agendaTitleDetailLiveSaveBtn').addEventListener('click',saveEdit);
    return overlay;
  }

  var activeId=0;
  function fillOverlay(id){
    var item=findItem(id);if(!item)return false;
    activeId=Number(id);
    var parts=splitNote(item.note);
    document.getElementById('agendaTitleDetailLiveHeading').textContent=parts.title||'Not';
    var text=document.getElementById('agendaTitleDetailLiveText');
    text.textContent=parts.detail||'Bu başlık için henüz ayrıntı yazılmamış.';
    text.classList.toggle('empty',!parts.detail);
    document.getElementById('agendaTitleDetailLiveMeta').textContent=formatMeta(item);
    document.getElementById('agendaTitleDetailLiveEditTitle').value=parts.title||'';
    document.getElementById('agendaTitleDetailLiveEditDetail').value=parts.detail||'';
    return true;
  }
  function openOverlay(id,editNow){
    var overlay=ensureOverlay();
    if(!fillOverlay(id))return;
    document.getElementById('agendaTitleDetailLiveView').classList.remove('hide');
    document.getElementById('agendaTitleDetailLiveEdit').classList.remove('show');
    overlay.classList.add('open');
    if(editNow)startEdit();
  }
  function closeOverlay(){
    var overlay=document.getElementById('agendaTitleDetailLiveOverlay');
    if(overlay)overlay.classList.remove('open');
    activeId=0;
  }
  function startEdit(){
    if(!activeId)return;
    fillOverlay(activeId);
    document.getElementById('agendaTitleDetailLiveView').classList.add('hide');
    document.getElementById('agendaTitleDetailLiveEdit').classList.add('show');
    setTimeout(function(){document.getElementById('agendaTitleDetailLiveEditTitle')?.focus()},25);
  }
  function cancelEdit(){
    if(!activeId)return closeOverlay();
    fillOverlay(activeId);
    document.getElementById('agendaTitleDetailLiveView').classList.remove('hide');
    document.getElementById('agendaTitleDetailLiveEdit').classList.remove('show');
  }
  async function saveEdit(){
    var item=findItem(activeId);if(!item)return;
    var title=String(document.getElementById('agendaTitleDetailLiveEditTitle').value||'').trim();
    var detail=String(document.getElementById('agendaTitleDetailLiveEditDetail').value||'').trim();
    if(!title){if(typeof showMsg==='function')showMsg('Başlık boş bırakılamaz.','err');return}
    try{
      var payload={entry_date:item.entry_date,note:combineNote(title,detail),remind_at:item.remind_at||''};
      if(Object.prototype.hasOwnProperty.call(item,'image_data'))payload.image_data=item.image_data||'';
      await req('/api/agenda/'+item.id,{method:'PUT',body:JSON.stringify(payload)});
      if(typeof showMsg==='function')showMsg('Ajanda notu güncellendi.');
      await loadAgenda();
      closeOverlay();
    }catch(error){if(typeof showMsg==='function')showMsg(error&&error.message?error.message:'Not güncellenemedi.','err')}
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeOverlay()});

  function decorateAgendaTitles(){
    document.querySelectorAll('#agenda .done-note[id],#agenda .agenda-note[id]').forEach(function(el){
      var id=idFromElement(el),item=id&&findItem(id);if(!item)return;
      var parts=splitNote(item.note),title=parts.title||'Başlıksız';
      if(el.textContent!==title)el.textContent=title;
      el.classList.add('agenda-title-live');
      el.title=parts.detail?'Ayrıntıları aç':'Notu aç';
      el.onclick=function(event){event.preventDefault();event.stopPropagation();openOverlay(id,false)};
    });
    document.querySelectorAll('#agenda .month-day-note,#agenda .agenda-week-note').forEach(function(el){
      var raw=String(el.textContent||'').replace(/^✓\s*/,'').replace(/^🔔\s*/,'');
      var first=(raw.replace(/\r\n/g,'\n').split('\n')[0]||'').trim();
      if(first&&raw!==first)el.textContent=first;
    });
  }

  function replaceDetailInput(noteId){
    var current=document.getElementById(noteId);if(!current)return null;
    if(current.tagName==='TEXTAREA')return current;
    var ta=document.createElement('textarea');
    ta.id=current.id;
    ta.name=current.name||'';
    ta.className=current.className||'';
    ta.value=current.value||'';
    ta.rows=4;
    ta.autocomplete='off';
    ta.setAttribute('autocapitalize','sentences');
    ta.placeholder='Not / maddeler — her maddeyi ayrı satıra yazın';
    current.replaceWith(ta);
    return ta;
  }
  function ensureComposer(noteId){
    var detail=replaceDetailInput(noteId);if(!detail)return;
    detail.classList.add('agenda-detail-entry');
    var wrap=detail.closest('.inline-agenda-add');if(!wrap)return;
    var titleId=noteId+'Title';
    if(document.getElementById(titleId))return;
    var holder=document.createElement('div');holder.className='agenda-title-entry';
    holder.innerHTML='<label>BAŞLIK</label><input id="'+titleId+'" type="text" autocomplete="off" autocapitalize="sentences" placeholder="Örn: TÜFEKÇİ">';
    var row=detail.parentElement;
    if(row&&row.parentElement===wrap)wrap.insertBefore(holder,row);else wrap.insertBefore(holder,wrap.firstChild);
    var title=document.getElementById(titleId);
    title.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();detail.focus()}});
  }
  function decorateComposers(){ensureComposer('todayInlineNote');ensureComposer('dayInlineNote')}

  var originalSave=window.saveAgendaInline;
  if(typeof originalSave==='function'){
    window.saveAgendaInline=async function(date,noteId,reminderId){
      var detail=document.getElementById(noteId),title=document.getElementById(noteId+'Title');
      if(!detail||!title)return originalSave.apply(this,arguments);
      var titleValue=String(title.value||'').trim(),detailValue=String(detail.value||'').trim();
      if(!titleValue){if(typeof showMsg==='function')showMsg('Önce başlık yazmalısınız.','err');title.focus();return}
      var old=detail.value;
      detail.value=combineNote(titleValue,detailValue);
      try{return await originalSave.apply(this,arguments)}finally{if(document.body.contains(detail))detail.value=old}
    };
  }

  /* Eski kalem düğmesi artık başlık + maddeler penceresini açar; ayrıntı kaybolmaz. */
  window.startInlineAgendaEdit=function(id){openOverlay(id,true)};

  var originalRender=window.renderAgenda;
  if(typeof originalRender==='function'){
    window.renderAgenda=function(){
      var result=originalRender.apply(this,arguments);
      queueMicrotask(function(){decorateComposers();decorateAgendaTitles()});
      return result;
    };
  }

  function apply(){decorateComposers();decorateAgendaTitles()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0)},{once:true});else setTimeout(apply,0);
  var pending=false;
  new MutationObserver(function(){if(pending)return;pending=true;queueMicrotask(function(){pending=false;apply()})}).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(apply,500);
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
      if(!html.includes('id="agendaDays"')||html.includes('agendaTitleDetailLiveSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',AGENDA_TITLE_DETAIL_LIVE+'\n</body>'):html+AGENDA_TITLE_DETAIL_LIVE;
      return rebuild(response,next);
    }catch(error){
      console.error('Agenda title/detail live patch failed',error);
      return backup;
    }
  }
};
