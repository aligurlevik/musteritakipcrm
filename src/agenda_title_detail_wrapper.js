import worker from './production_guard.js';

const INJECT = String.raw`
<style id="agendaTitleDetailStyle">
.agenda-title-click{font-weight:900;color:#0f172a;cursor:pointer;text-decoration:none;border-radius:6px;padding:2px 4px;margin-left:-4px;display:inline-block;max-width:100%}
.agenda-title-click:hover{background:#dbeafe;color:#1d4ed8}
.agenda-detail-modal .box{width:min(680px,94vw)}
.agenda-detail-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.agenda-detail-head h3{margin:0;color:#1e3a8a;font-size:22px}
.agenda-detail-text{white-space:pre-wrap;line-height:1.55;padding:14px;background:#f8fafc;border:1px solid #dbe2ea;border-radius:10px;min-height:90px;font-size:15px}
.agenda-detail-meta{font-size:12px;color:#64748b;margin:8px 0 12px}
.agenda-detail-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
.agenda-detail-edit{display:none;gap:10px}
.agenda-detail-edit.show{display:grid}
.agenda-detail-view.hide{display:none}
.agenda-detail-edit label{font-size:12px;font-weight:900;color:#475569}
.agenda-detail-edit textarea{min-height:180px;resize:vertical}
.agenda-title-field{grid-column:1/-1!important;margin-bottom:2px}
.agenda-title-field input{font-weight:900;background:#fff;border:2px solid #93c5fd}
.inline-agenda-add .agenda-detail-input{grid-column:1/-1!important}
</style>
<script id="agendaTitleDetailScript">
(()=>{
  'use strict';
  const parseNote=value=>{
    const raw=String(value??'').replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    const lines=raw.split('\n');
    if(lines.length>1){
      const title=(lines.shift()||'').trim();
      const detail=lines.join('\n').replace(/^\s+/, '').trim();
      return {title:title||detail,detail:title?detail:''};
    }
    const paren=raw.match(/^(.{2,60}?)\s*\((.+)\)\s*$/s);
    if(paren)return {title:paren[1].trim(),detail:paren[2].trim()};
    return {title:raw,detail:''};
  };
  const combineNote=(title,detail)=>{
    title=String(title||'').trim(); detail=String(detail||'').trim();
    return detail?title+'\n\n'+detail:title;
  };
  const itemById=id=>{
    const n=Number(id);
    return (agendaEntries||[]).find(x=>Number(x.id)===n)||(todayAgendaEntries||[]).find(x=>Number(x.id)===n)||null;
  };
  function ensureModal(){
    if(document.getElementById('agendaDetailModal'))return;
    const modal=document.createElement('div');
    modal.id='agendaDetailModal';
    modal.className='modal agenda-detail-modal';
    modal.innerHTML=`<div class="box" onclick="event.stopPropagation()">
      <div class="agenda-detail-head"><h3 id="agendaDetailTitle">Ajanda Notu</h3><button class="btn" type="button" onclick="closeAgendaDetailModal()">✕</button></div>
      <div id="agendaDetailView" class="agenda-detail-view">
        <div id="agendaDetailMeta" class="agenda-detail-meta"></div>
        <div id="agendaDetailText" class="agenda-detail-text"></div>
        <div class="agenda-detail-actions"><button class="btn primary" type="button" onclick="editAgendaDetailModal()">✏️ Düzenle</button><button class="btn" type="button" onclick="closeAgendaDetailModal()">Kapat</button></div>
      </div>
      <div id="agendaDetailEdit" class="agenda-detail-edit">
        <label>BAŞLIK</label><input id="agendaDetailEditTitle" type="text" autocomplete="off">
        <label>NOT / AÇIKLAMA</label><textarea id="agendaDetailEditText"></textarea>
        <div class="agenda-detail-actions"><button class="btn green" type="button" onclick="saveAgendaDetailModal()">Kaydet</button><button class="btn" type="button" onclick="cancelAgendaDetailEdit()">Vazgeç</button></div>
      </div>
    </div>`;
    modal.addEventListener('click',()=>window.closeAgendaDetailModal());
    document.body.appendChild(modal);
  }
  let activeId=null;
  window.openAgendaDetailModal=id=>{
    ensureModal();
    const item=itemById(id); if(!item)return;
    activeId=Number(id);
    const parsed=parseNote(item.note);
    document.getElementById('agendaDetailTitle').textContent=parsed.title||'Ajanda Notu';
    document.getElementById('agendaDetailText').textContent=parsed.detail||'Açıklama eklenmemiş.';
    const date=item.entry_date?new Date(item.entry_date+'T12:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
    const alarm=item.remind_at?new Date(item.remind_at).toLocaleString('tr-TR'):'';
    document.getElementById('agendaDetailMeta').textContent=[date&&'📅 '+date,alarm&&'🔔 '+alarm].filter(Boolean).join('   ');
    document.getElementById('agendaDetailEditTitle').value=parsed.title;
    document.getElementById('agendaDetailEditText').value=parsed.detail;
    document.getElementById('agendaDetailView').classList.remove('hide');
    document.getElementById('agendaDetailEdit').classList.remove('show');
    document.getElementById('agendaDetailModal').classList.add('open');
  };
  window.closeAgendaDetailModal=()=>{document.getElementById('agendaDetailModal')?.classList.remove('open');activeId=null};
  window.editAgendaDetailModal=()=>{
    if(!activeId)return;
    document.getElementById('agendaDetailView').classList.add('hide');
    document.getElementById('agendaDetailEdit').classList.add('show');
    setTimeout(()=>document.getElementById('agendaDetailEditTitle')?.focus(),30);
  };
  window.cancelAgendaDetailEdit=()=>{
    if(!activeId)return;
    const item=itemById(activeId),parsed=parseNote(item?.note||'');
    document.getElementById('agendaDetailEditTitle').value=parsed.title;
    document.getElementById('agendaDetailEditText').value=parsed.detail;
    document.getElementById('agendaDetailView').classList.remove('hide');
    document.getElementById('agendaDetailEdit').classList.remove('show');
  };
  window.saveAgendaDetailModal=async()=>{
    if(!activeId)return;
    const item=itemById(activeId); if(!item)return;
    const title=document.getElementById('agendaDetailEditTitle').value.trim();
    const detail=document.getElementById('agendaDetailEditText').value.trim();
    if(!title){showMsg?.('Başlık boş bırakılamaz.','err');return;}
    try{
      await req('/api/agenda/'+activeId,{method:'PUT',body:JSON.stringify({entry_date:item.entry_date,note:combineNote(title,detail),remind_at:item.remind_at||''})});
      showMsg?.('Ajanda notu güncellendi.');
      window.closeAgendaDetailModal();
      await loadAgenda();
    }catch(error){showMsg?.(error?.message||'Not güncellenemedi.','err');}
  };
  function idFromTextElement(el){
    const match=String(el.id||'').match(/-(\d+)$/); return match?Number(match[1]):null;
  }
  function decorateVisibleTitles(){
    document.querySelectorAll('.done-note[id],.agenda-note[id]').forEach(el=>{
      const id=idFromTextElement(el),item=itemById(id); if(!item)return;
      const {title}=parseNote(item.note);
      const shown=title||'Başlıksız'; if(el.textContent!==shown)el.textContent=shown;
      el.classList.add('agenda-title-click');
      el.title='Notu aç';
      el.onclick=event=>{event.stopPropagation();window.openAgendaDetailModal(id)};
    });
    document.querySelectorAll('.month-day').forEach(dayEl=>{
      const onclick=dayEl.getAttribute('onclick')||'';
      const date=(onclick.match(/openDailyAgenda\('([^']+)'\)/)||[])[1]; if(!date)return;
      const items=(agendaEntries||[]).filter(x=>x.entry_date===date).sort((a,b)=>Number(a.entry_status==='Yapıldı')-Number(b.entry_status==='Yapıldı')||Number(a.id)-Number(b.id));
      dayEl.querySelectorAll('.month-day-note').forEach((noteEl,index)=>{
        const item=items[index]; if(!item)return;
        const {title}=parseNote(item.note); const shown=(item.entry_status==='Yapıldı'?'✓ ':'')+(item.remind_at?'🔔 ':'')+(title||'Başlıksız'); if(noteEl.textContent!==shown)noteEl.textContent=shown;
      });
    });
  }
  function ensureTitleInput(noteId){
    const detail=document.getElementById(noteId); if(!detail||document.getElementById(noteId+'Title'))return;
    const wrap=detail.closest('.inline-agenda-add'); if(!wrap)return;
    const field=document.createElement('div'); field.className='agenda-title-field';
    const title=document.createElement('input'); title.id=noteId+'Title'; title.type='text'; title.autocomplete='off'; title.placeholder='Başlık (ör. TÜFEKÇİ)';
    field.appendChild(title);
    const row=detail.parentElement;
    if(row&&row.parentElement===wrap)wrap.insertBefore(field,row); else wrap.insertBefore(field,wrap.firstChild);
    detail.placeholder='Not / açıklama yazın'; detail.classList.add('agenda-detail-input');
    title.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();detail.focus();}});
  }
  function decorateInputs(){ensureTitleInput('todayInlineNote');ensureTitleInput('dayInlineNote');}
  const originalSave=window.saveAgendaInline;
  if(typeof originalSave==='function'){
    window.saveAgendaInline=async function(date,noteId,reminderId){
      const note=document.getElementById(noteId),titleEl=document.getElementById(noteId+'Title');
      if(!note||!titleEl)return originalSave.apply(this,arguments);
      const title=titleEl.value.trim(),detail=note.value.trim();
      if(!title){showMsg?.('Önce başlık yazmalısınız.','err');titleEl.focus();return;}
      const old=note.value; note.value=combineNote(title,detail);
      try{await originalSave.apply(this,arguments);}finally{if(document.body.contains(note))note.value=old;}
    };
  }
  const originalRender=window.renderAgenda;
  if(typeof originalRender==='function'){
    window.renderAgenda=function(){const result=originalRender.apply(this,arguments);queueMicrotask(()=>{decorateInputs();decorateVisibleTitles();});return result;};
  }
  document.addEventListener('DOMContentLoaded',()=>{ensureModal();decorateInputs();decorateVisibleTitles();});
  const observer=new MutationObserver(()=>{decorateInputs();decorateVisibleTitles();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>{ensureModal();decorateInputs();decorateVisibleTitles();},0);
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
