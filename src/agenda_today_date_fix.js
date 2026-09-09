import worker from './agenda_rolling_week_patch.js';

const oldDefaultDate = "const defaultDate=agendaDateKey();";
const newDefaultDate = "const defaultDate=prefix==='todayInline'?localDateKey():agendaDateKey();";

const oldAgendaTaskSort = "function agendaTaskSort(a,b){return Number(a.entry_status==='Yapıldı')-Number(b.entry_status==='Yapıldı')||Number(a.id)-Number(b.id)}";
const newAgendaTaskSort = "function agendaTaskSort(a,b){return Number(a.entry_status==='Yapıldı')-Number(b.entry_status==='Yapıldı')||Number(a.id)-Number(b.id)}function agendaDailySort(a,b){const today=localDateKey(),ad=String(a.entry_date||''),bd=String(b.entry_date||''),aFuture=ad===today?0:1,bFuture=bd===today?0:1;if(aFuture!==bFuture)return aFuture-bFuture;if(ad!==bd)return ad.localeCompare(bd);const aDone=Number(a.entry_status==='Yapıldı'),bDone=Number(b.entry_status==='Yapıldı');if(aDone!==bDone)return aDone-bDone;const at=String(a.remind_at||''),bt=String(b.remind_at||'');if(at&&bt&&at!==bt)return at.localeCompare(bt);if(at&&!bt)return 1;if(!at&&bt)return -1;return Number(a.id)-Number(b.id)}";
const oldDailySort = "[...todayAgendaEntries].sort(agendaTaskSort)";
const newDailySort = "[...todayAgendaEntries].sort(agendaDailySort)";

const NOTE_DAY_STYLE = `
<style id="agendaWeekNoteEmphasis">
.agenda-week-day:has(.agenda-week-count):not(.today){
  background:#fff7ed!important;
  border:2px solid #f59e0b!important;
  box-shadow:inset 0 0 0 1px #fed7aa;
}
.agenda-week-day:has(.agenda-week-count):not(.today) .agenda-week-date{color:#9a3412!important}
.agenda-week-day:has(.agenda-week-count):not(.today) .agenda-week-count{background:#f59e0b!important;color:#fff!important}
.agenda-week-day:not(:has(.agenda-week-count)):not(.today){opacity:.72}
.agenda-week-day.today:has(.agenda-week-count){box-shadow:inset 0 0 0 2px #60a5fa}
</style>`;

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
    html=html.split(oldDefaultDate).join(newDefaultDate);
    html=html.split(oldAgendaTaskSort).join(newAgendaTaskSort);
    html=html.split(oldDailySort).join(newDailySort);
    if(!html.includes('agendaWeekNoteEmphasis'))html=html.replace('</body>',NOTE_DAY_STYLE+'\n</body>');

    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
