import worker from './waiting_price_optional_patch.js';

const WEEKLY_AGENDA_PATCH = `
<style id="agendaRollingWeekStyle">
#agendaRollingWeek{margin:4px 0 18px;padding:13px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:13px;box-shadow:0 4px 14px #0f172a0d}
.agenda-week-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.agenda-week-title{font-size:15px;font-weight:900;color:#0f172a}.agenda-week-range{font-size:11px;font-weight:800;color:#64748b}
.agenda-week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
.agenda-week-day{min-width:0;min-height:92px;border:1px solid #dbe2ea;border-radius:10px;background:#f8fafc;padding:8px;cursor:pointer;text-align:left;color:#0f172a;transition:border-color .15s,background .15s,transform .15s}
.agenda-week-day:hover{border-color:#60a5fa;background:#eff6ff}.agenda-week-day:active{transform:translateY(1px)}
.agenda-week-day.today{border:2px solid #2563eb;background:#dbeafe}
.agenda-week-name{display:block;font-size:11px;font-weight:900;color:#475569}.agenda-week-date{display:block;margin-top:1px;font-size:17px;font-weight:950;color:#1e3a8a}
.agenda-week-count{display:inline-block;margin-top:5px;padding:2px 6px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:10px;font-weight:900}
.agenda-week-day.today .agenda-week-count{background:#fff;color:#1d4ed8}
.agenda-week-note{display:block;margin-top:5px;font-size:10px;font-weight:750;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#334155}
.agenda-week-empty{display:block;margin-top:8px;font-size:10px;color:#94a3b8}
@media(max-width:900px){.agenda-week-grid{overflow-x:auto;grid-template-columns:repeat(7,minmax(112px,1fr));padding-bottom:3px}.agenda-week-day{min-height:88px}}
</style>
<script>
(function(){
  if(window.__agendaRollingWeekLoaded)return;
  window.__agendaRollingWeekLoaded=true;
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const escWeek=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function weekItems(dateKey){
    try{return (agendaEntries||[]).filter(x=>String(x.entry_date||'').slice(0,10)===dateKey&&x.entry_status!=='Yapıldı')}
    catch(_){return []}
  }
  function renderAgendaRollingWeek(){
    const agendaHost=document.getElementById('agendaDays');
    if(!agendaHost||!agendaHost.parentNode)return;
    let box=document.getElementById('agendaRollingWeek');
    if(!box){box=document.createElement('section');box.id='agendaRollingWeek';agendaHost.parentNode.insertBefore(box,agendaHost)}
    const start=new Date();start.setHours(12,0,0,0);
    const days=[];
    for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d)}
    const end=days[6];
    const cards=days.map((d,i)=>{
      const dateKey=key(d),items=weekItems(dateKey),preview=items.slice(0,2).map(x=>'<span class="agenda-week-note">• '+escWeek(x.note||'Not')+'</span>').join('');
      return '<button type="button" class="agenda-week-day '+(i===0?'today':'')+'" data-agenda-week-date="'+dateKey+'" title="'+d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})+'">'+
        '<span class="agenda-week-name">'+(i===0?'BUGÜN · ':'')+d.toLocaleDateString('tr-TR',{weekday:'short'}).toLocaleUpperCase('tr-TR')+'</span>'+
        '<span class="agenda-week-date">'+d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+'</span>'+
        (items.length?'<span class="agenda-week-count">'+items.length+' not</span>'+preview:'<span class="agenda-week-empty">Not yok</span>')+
      '</button>';
    }).join('');
    box.innerHTML='<div class="agenda-week-head"><div class="agenda-week-title">📅 Haftalık Takvim</div><div class="agenda-week-range">'+start.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+' – '+end.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+'</div></div><div class="agenda-week-grid">'+cards+'</div>';
    box.querySelectorAll('[data-agenda-week-date]').forEach(button=>button.addEventListener('click',()=>{
      const date=button.getAttribute('data-agenda-week-date');
      if(typeof openDailyAgenda==='function')openDailyAgenda(date);
    }));
  }
  function initAgendaRollingWeek(){
    const agendaHost=document.getElementById('agendaDays');
    if(!agendaHost){setTimeout(initAgendaRollingWeek,250);return}
    renderAgendaRollingWeek();
    const observer=new MutationObserver(()=>renderAgendaRollingWeek());
    observer.observe(agendaHost,{childList:true,subtree:true});
    window.addEventListener('focus',renderAgendaRollingWeek);
    setInterval(renderAgendaRollingWeek,60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAgendaRollingWeek,{once:true});else initAgendaRollingWeek();
})();
</script>`;

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const type=response.headers.get('content-type')||'';
    if(request.method!=='GET'||!shouldPatch(url.pathname)||!response.ok||!type.includes('text/html'))return response;

    let html=await response.text();
    if(!html.includes('agendaRollingWeekStyle'))html=html.replace('</body>',WEEKLY_AGENDA_PATCH+'\n</body>');

    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
