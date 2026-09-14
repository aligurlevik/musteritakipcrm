import worker from './production_guard.js';

const INJECT = String.raw`
<style id="agendaTitleDetailStyle">
.agenda-title-click{font-weight:900;color:#0f172a;cursor:pointer;text-decoration:none;border-radius:6px;padding:2px 4px;margin-left:-4px;display:inline-flex;align-items:center;gap:6px;max-width:100%}
.agenda-title-click:after{content:'▾';font-size:10px;color:#64748b;transition:transform .15s}
.agenda-title-click.agenda-open:after{transform:rotate(180deg)}
.agenda-title-click:hover{background:#dbeafe;color:#1d4ed8}
.agenda-inline-detail{grid-column:1/-1;display:none;margin:5px 0 8px 29px;padding:12px 14px;background:#fff;border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:10px;box-shadow:0 4px 12px #0f172a10}
.agenda-inline-detail.open{display:block}
.agenda-inline-detail-text{white-space:pre-wrap;line-height:1.55;color:#1f2937;font-size:14px;min-height:24px}
.agenda-inline-detail-empty{color:#94a3b8;font-style:italic}
.agenda-inline-detail-meta{font-size:11px;color:#64748b;margin-top:9px}
.agenda-inline-detail-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:10px;flex-wrap:wrap}
.agenda-inline-edit{display:none;gap:8px;margin-top:8px}
.agenda-inline-edit.show{display:grid}
.agenda-inline-view.hide{display:none}
.agenda-inline-edit label{font-size:11px;font-weight:900;color:#475569}
.agenda-inline-edit textarea{min-height:120px;resize:vertical}
.agenda-inline-edit input{font-weight:900}
.agenda-title-field{grid-column:1/-1!important;margin-bottom:2px}
.agenda-title-field input{font-weight:900;background:#fff;border:2px solid #93c5fd}
.inline-agenda-add .agenda-detail-input{grid-column:1/-1!important}
button[data-agenda-old-edit="1"]{display:none!important}
</style>
<script id="agendaTitleDetailScript">
(function(){
  'use strict';
  if(window.__agendaTitleDetailLoaded)return;
  window.__agendaTitleDetailLoaded=true;

  function parseNote(value){
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
  function combineNote(title,detail){
    title=String(title||'').trim();detail=String(detail||'').trim();
    return detail?title+'\n\n'+detail:title;
  }
  function itemById(id){
    var n=Number(id),a=Array.isArray(window.agendaEntries)?window.agendaEntries:agendaEntries,b=Array.isArray(window.todayAgendaEntries)?window.todayAgendaEntries:todayAgendaEntries;
    return (a||[]).find(function(x){return Number(x.id)===n})||(b||[]).find(function(x){return Number(x.id)===n})||null;
  }
  function idFromTextElement(el){
    var m=String(el.id||'').match(/-(\d+)$/);return m?Number(m[1]):null;
  }
  function detailHostFor(el){return el.closest('.done-item,.agenda-entry')}
  function detailId(id){return 'agendaInlineDetail-'+id}
  function formatMeta(item){
    var parts=[];
    if(item&&item.entry_date)parts.push('📅 '+new Date(item.entry_date+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}));
    if(item&&item.remind_at)parts.push('🔔 '+new Date(item.remind_at).toLocaleString('tr-TR'));
    return parts.join('   ');
  }
  function closeOtherDetails(exceptId){
    document.querySelectorAll('.agenda-inline-detail.open').forEach(function(panel){
      if(panel.id!==detailId(exceptId))panel.classList.remove('open');
    });
    document.querySelectorAll('.agenda-title-click.agenda-open').forEach(function(title){
      if(Number(title.getAttribute('data-agenda-id'))!==Number(exceptId))title.classList.remove('agenda-open');
    });
  }
  function buildDetailPanel(id,host,item){
    var panel=document.getElementById(detailId(id));
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id=detailId(id);
    panel.className='agenda-inline-detail';
    panel.setAttribute('data-agenda-id',String(id));
    panel.innerHTML='<div class="agenda-inline-view">'+
      '<div class="agenda-inline-detail-text"></div>'+
      '<div class="agenda-inline-detail-meta"></div>'+
      '<div class="agenda-inline-detail-actions"><button class="btn primary agenda-inside-edit" type="button">✏️ Düzenle</button><button class="btn agenda-inside-close" type="button">Kapat</button></div>'+
      '</div>'+
      '<div class="agenda-inline-edit">'+
      '<label>BAŞLIK</label><input class="agenda-edit-title" type="text" autocomplete="off">'+
      '<label>NOT / AÇIKLAMA</label><textarea class="agenda-edit-detail"></textarea>'+
      '<div class="agenda-inline-detail-actions"><button class="btn green agenda-inside-save" type="button">Kaydet</button><button class="btn agenda-inside-cancel" type="button">Vazgeç</button></div>'+
      '</div>';
    host.appendChild(panel);
    panel.querySelector('.agenda-inside-edit').addEventListener('click',function(e){e.stopPropagation();startPanelEdit(id)});
    panel.querySelector('.agenda-inside-close').addEventListener('click',function(e){e.stopPropagation();closeAgendaDetail(id)});
    panel.querySelector('.agenda-inside-save').addEventListener('click',function(e){e.stopPropagation();savePanelEdit(id)});
    panel.querySelector('.agenda-inside-cancel').addEventListener('click',function(e){e.stopPropagation();cancelPanelEdit(id)});
    return panel;
  }
  function syncPanel(id){
    var item=itemById(id),panel=document.getElementById(detailId(id));if(!item||!panel)return;
    var parsed=parseNote(item.note),text=panel.querySelector('.agenda-inline-detail-text');
    text.textContent=parsed.detail||'Açıklama eklenmemiş.';
    text.classList.toggle('agenda-inline-detail-empty',!parsed.detail);
    panel.querySelector('.agenda-inline-detail-meta').textContent=formatMeta(item);
    panel.querySelector('.agenda-edit-title').value=parsed.title;
    panel.querySelector('.agenda-edit-detail').value=parsed.detail;
  }
  function toggleAgendaDetail(id,titleEl){
    var item=itemById(id);if(!item)return;
    var host=detailHostFor(titleEl);if(!host)return;
    var panel=buildDetailPanel(id,host,item),willOpen=!panel.classList.contains('open');
    closeOtherDetails(willOpen?id:null);
    if(willOpen){syncPanel(id);panel.classList.add('open');titleEl.classList.add('agenda-open')}
    else{panel.classList.remove('open');titleEl.classList.remove('agenda-open')}
  }
  function closeAgendaDetail(id){
    var panel=document.getElementById(detailId(id));if(panel)panel.classList.remove('open');
    var title=document.querySelector('.agenda-title-click[data-agenda-id="'+id+'"]');if(title)title.classList.remove('agenda-open');
  }
  function startPanelEdit(id){
    var panel=document.getElementById(detailId(id));if(!panel)return;syncPanel(id);
    panel.querySelector('.agenda-inline-view').classList.add('hide');
    panel.querySelector('.agenda-inline-edit').classList.add('show');
    setTimeout(function(){var input=panel.querySelector('.agenda-edit-title');if(input)input.focus()},30);
  }
  function cancelPanelEdit(id){
    var panel=document.getElementById(detailId(id));if(!panel)return;syncPanel(id);
    panel.querySelector('.agenda-inline-view').classList.remove('hide');
    panel.querySelector('.agenda-inline-edit').classList.remove('show');
  }
  async function savePanelEdit(id){
    var panel=document.getElementById(detailId(id)),item=itemById(id);if(!panel||!item)return;
    var title=panel.querySelector('.agenda-edit-title').value.trim(),detail=panel.querySelector('.agenda-edit-detail').value.trim();
    if(!title){if(typeof showMsg==='function')showMsg('Başlık boş bırakılamaz.','err');return}
    try{
      await req('/api/agenda/'+id,{method:'PUT',body:JSON.stringify({entry_date:item.entry_date,note:combineNote(title,detail),remind_at:item.remind_at||''})});
      if(typeof showMsg==='function')showMsg('Ajanda notu güncellendi.');
      await loadAgenda();
    }catch(error){if(typeof showMsg==='function')showMsg(error&&error.message?error.message:'Not güncellenemedi.','err')}
  }
  window.toggleAgendaDetail=toggleAgendaDetail;
  window.closeAgendaDetail=closeAgendaDetail;

  function decorateVisibleTitles(){
    document.querySelectorAll('.done-note[id],.agenda-note[id]').forEach(function(el){
      var id=idFromTextElement(el),item=itemById(id);if(!item)return;
      var parsed=parseNote(item.note),shown=parsed.title||'Başlıksız';
      if(el.textContent!==shown)el.textContent=shown;
      el.classList.add('agenda-title-click');el.setAttribute('data-agenda-id',String(id));el.title='Detayı aç / kapat';
      el.onclick=function(event){event.stopPropagation();toggleAgendaDetail(id,el)};
    });
    document.querySelectorAll('button[onclick^="startInlineAgendaEdit("]').forEach(function(btn){btn.setAttribute('data-agenda-old-edit','1')});
    decorateMonthTitles();decorateWeekTitles();
  }
  function decorateMonthTitles(){
    document.querySelectorAll('.month-day').forEach(function(dayEl){
      var onclick=dayEl.getAttribute('onclick')||'',m=onclick.match(/openDailyAgenda\('([^']+)'\)/),date=m&&m[1];if(!date)return;
      var items=(agendaEntries||[]).filter(function(x){return x.entry_date===date}).sort(function(a,b){return Number(a.entry_status==='Yapıldı')-Number(b.entry_status==='Yapıldı')||Number(a.id)-Number(b.id)});
      dayEl.querySelectorAll('.month-day-note').forEach(function(noteEl,index){
        var item=items[index];if(!item)return;var parsed=parseNote(item.note),shown=(item.entry_status==='Yapıldı'?'✓ ':'')+(item.remind_at?'🔔 ':'')+(parsed.title||'Başlıksız');
        if(noteEl.textContent!==shown)noteEl.textContent=shown;
      });
    });
  }
  function decorateWeekTitles(){
    document.querySelectorAll('.agenda-week-day[data-agenda-week-date]').forEach(function(dayEl){
      var date=dayEl.getAttribute('data-agenda-week-date');
      var items=(agendaEntries||[]).filter(function(x){return String(x.entry_date||'').slice(0,10)===date&&x.entry_status!=='Yapıldı'});
      dayEl.querySelectorAll('.agenda-week-note').forEach(function(noteEl,index){var item=items[index];if(!item)return;var parsed=parseNote(item.note),shown='• '+(parsed.title||'Başlıksız');if(noteEl.textContent!==shown)noteEl.textContent=shown});
    });
  }
  function ensureTitleInput(noteId){
    var detail=document.getElementById(noteId);if(!detail||document.getElementById(noteId+'Title'))return;
    var wrap=detail.closest('.inline-agenda-add');if(!wrap)return;
    var field=document.createElement('div');field.className='agenda-title-field';
    var title=document.createElement('input');title.id=noteId+'Title';title.type='text';title.autocomplete='off';title.placeholder='Başlık (ör. TÜFEKÇİ)';
    field.appendChild(title);
    var row=detail.parentElement;
    if(row&&row.parentElement===wrap)wrap.insertBefore(field,row);else wrap.insertBefore(field,wrap.firstChild);
    detail.placeholder='Not / açıklama yazın';detail.classList.add('agenda-detail-input');
    title.addEventListener('keydown',function(event){if(event.key==='Enter'){event.preventDefault();detail.focus()}});
  }
  function decorateInputs(){ensureTitleInput('todayInlineNote');ensureTitleInput('dayInlineNote')}

  var originalSave=window.saveAgendaInline;
  if(typeof originalSave==='function'){
    window.saveAgendaInline=async function(date,noteId,reminderId){
      var note=document.getElementById(noteId),titleEl=document.getElementById(noteId+'Title');
      if(!note||!titleEl)return originalSave.apply(this,arguments);
      var title=titleEl.value.trim(),detail=note.value.trim();
      if(!title){if(typeof showMsg==='function')showMsg('Önce başlık yazmalısınız.','err');titleEl.focus();return}
      var old=note.value;note.value=combineNote(title,detail);
      try{return await originalSave.apply(this,arguments)}finally{if(document.body.contains(note))note.value=old}
    };
  }
  var originalRender=window.renderAgenda;
  if(typeof originalRender==='function'){
    window.renderAgenda=function(){var result=originalRender.apply(this,arguments);queueMicrotask(function(){decorateInputs();decorateVisibleTitles()});return result};
  }
  function init(){decorateInputs();decorateVisibleTitles()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  var observer=new MutationObserver(function(){decorateInputs();decorateVisibleTitles()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(init,0);
})();
</script>`;

function shouldInject(request,response,html){
  if(request.method!=='GET')return false;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return false;
  return html.includes('id="agendaDays"')&&!html.includes('agendaTitleDetailScript');
}

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
      if(!shouldInject(request,response,html))return rebuilt(response,html);
      const next=html.includes('</body>')?html.replace('</body>',INJECT+'\n</body>'):html+INJECT;
      return rebuilt(response,next);
    }catch(error){
      console.error('Agenda title/detail injection failed',error);
      return copy;
    }
  }
};
