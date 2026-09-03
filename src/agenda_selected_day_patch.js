import worker from './cagatay_agenda_patch.js';

const agendaSelectedDayPatch = `
<style>
  /* Ajanda takviminde secilen gun belirgin olsun; bugun sadece ikincil isaret kalsin. */
  #agendaDays .month-day.agenda-selected-day{
    background:#dbeafe!important;
    border:2px solid #2563eb!important;
    box-shadow:inset 0 0 0 1px #60a5fa,0 2px 8px #2563eb22!important;
  }
  #agendaDays .month-day.agenda-selected-day .month-day-number{
    color:#1d4ed8!important;
    font-weight:1000!important;
  }
  #agendaDays .month-day.today:not(.agenda-selected-day){
    background:#f0fdf4!important;
    border-color:#86efac!important;
    box-shadow:inset 0 0 0 1px #86efac!important;
  }
  #agendaDays .month-day.today:not(.agenda-selected-day) .month-day-number{
    color:#166534!important;
  }
</style>
<script>
(function(){
  function selectedAgendaDate(){
    try{
      if(typeof agendaDateKey==='function')return agendaDateKey();
    }catch(_){ }
    return '';
  }

  function markSelectedAgendaDay(){
    var selected=selectedAgendaDate();
    if(!selected)return;
    document.querySelectorAll('#agendaDays .month-day').forEach(function(button){
      var onclick=String(button.getAttribute('onclick')||'');
      var match=onclick.match(/openDailyAgenda\\('([0-9]{4}-[0-9]{2}-[0-9]{2})'\\)/);
      button.classList.toggle('agenda-selected-day',Boolean(match&&match[1]===selected));
      if(match&&match[1]===selected)button.setAttribute('aria-current','date');
      else button.removeAttribute('aria-current');
    });
  }

  function wrapRender(){
    if(typeof window.renderAgendaMonth!=='function'||window.renderAgendaMonth.__selectedDayWrapped)return;
    var original=window.renderAgendaMonth;
    var wrapped=function(){
      var result=original.apply(this,arguments);
      requestAnimationFrame(markSelectedAgendaDay);
      return result;
    };
    wrapped.__selectedDayWrapped=true;
    window.renderAgendaMonth=wrapped;
  }

  wrapRender();
  window.addEventListener('load',function(){wrapRender();setTimeout(markSelectedAgendaDay,0)});
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('#agendaDays .month-day'))setTimeout(markSelectedAgendaDay,0);
  });

  var observer=new MutationObserver(function(){markSelectedAgendaDay()});
  var startObserver=function(){var host=document.getElementById('agendaDays');if(host)observer.observe(host,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver);else startObserver();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('agenda-selected-day'))html=html.replace('</body>',agendaSelectedDayPatch+'\\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
