import worker from './desktop_agenda_eye_safe.js';

const AGENDA_DAY_COLORS = String.raw`
<style id="agendaDayColorsSafeStyle">
.agenda-day-color-row{border-left-width:5px!important;border-left-style:solid!important;border-radius:9px!important}
.month-day-note.agenda-day-color-note,.agenda-week-note.agenda-day-color-note{border-radius:6px!important;padding:2px 5px!important}
</style>
<script id="agendaDayColorsSafeScript">
(function(){
  if(window.__agendaDayColorsSafe)return;
  window.__agendaDayColorsSafe=true;

  var palette=[
    {bg:'#e8f3ff',border:'#3b82f6'},
    {bg:'#eafaf1',border:'#22c55e'},
    {bg:'#fff4df',border:'#f59e0b'},
    {bg:'#f3eefe',border:'#8b5cf6'},
    {bg:'#ffecef',border:'#f43f5e'},
    {bg:'#e8fbfb',border:'#14b8a6'},
    {bg:'#f5f0e8',border:'#a16207'}
  ];

  function colorForDate(date){
    var text=String(date||'').slice(0,10);
    var m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return palette[0];
    var day=Math.floor(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))/86400000);
    var idx=((day%palette.length)+palette.length)%palette.length;
    return palette[idx];
  }

  function agendaItemById(id){
    try{
      if(typeof agendaEntries!=='undefined'&&Array.isArray(agendaEntries)){
        return agendaEntries.find(function(x){return Number(x.id)===Number(id)})||null;
      }
    }catch(_){}
    return null;
  }

  function paint(el,date,isRow){
    if(!el||!date)return;
    var c=colorForDate(date);
    el.style.backgroundColor=c.bg;
    if(isRow){
      el.classList.add('agenda-day-color-row');
      el.style.borderLeftColor=c.border;
    }else{
      el.classList.add('agenda-day-color-note');
      el.style.boxShadow='inset 3px 0 0 '+c.border;
    }
  }

  function idFromElement(el){
    var m=String(el&&el.id||'').match(/-(\d+)$/);
    return m?Number(m[1]):0;
  }

  function applyMainLists(){
    document.querySelectorAll('.done-note[id],.agenda-note[id]').forEach(function(note){
      var id=idFromElement(note),item=id?agendaItemById(id):null;
      if(!item||!item.entry_date)return;
      var row=note.closest('.done-item,.agenda-entry');
      paint(row,item.entry_date,true);
    });
  }

  function applyMonth(){
    document.querySelectorAll('.month-day').forEach(function(day){
      var code=String(day.getAttribute('onclick')||'');
      var m=code.match(/openDailyAgenda\('([^']+)'\)/);
      if(!m)return;
      var date=m[1];
      day.querySelectorAll('.month-day-note').forEach(function(note){paint(note,date,false)});
    });
  }

  function applyWeek(){
    document.querySelectorAll('.agenda-week-day[data-agenda-week-date]').forEach(function(day){
      var date=day.getAttribute('data-agenda-week-date');
      day.querySelectorAll('.agenda-week-note').forEach(function(note){paint(note,date,false)});
    });
  }

  function apply(){applyMainLists();applyMonth();applyWeek()}

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
      if(!html.includes('id="agendaDays"')||html.includes('agendaDayColorsSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',AGENDA_DAY_COLORS+'\n</body>'):html+AGENDA_DAY_COLORS;
      return rebuild(response,next);
    }catch(error){
      console.error('Agenda day colors patch failed',error);
      return backup;
    }
  }
};
