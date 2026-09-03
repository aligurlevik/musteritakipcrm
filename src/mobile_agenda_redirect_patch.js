import worker from './tracking_total_count_patch.js';

function isMobileRequest(request){
  const mobileHint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(mobileHint==='?1')return true;
  const ua=request.headers.get('user-agent')||'';
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

const mobileAgendaPatch=`
<style id="mobileAgendaPatch">
@media(max-width:900px){
  body{overflow-x:hidden!important;background:#f1f3f6!important}
  .app{display:block!important;min-height:100vh!important}
  .side{display:none!important}
  .main{padding:0!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}
  .top{display:none!important}
  #agenda{display:block!important;width:100%!important;max-width:100%!important;padding:0 10px 18px!important}
  #agenda .toolbar{display:block!important;margin:0 -10px 10px!important;padding:14px 16px 12px!important;background:#ffd54f!important;box-shadow:0 2px 8px #0002!important}
  #agenda .toolbar>div:first-child{width:100%!important}
  #agendaViewTitle{font-size:23px!important;line-height:1!important;text-align:left!important;margin:0!important;color:#3f3a25!important;font-weight:900!important}
  #agendaViewSubtitle,#agendaMonthControls,#agendaDayControls{display:none!important}
  #agenda .agenda-overview{display:block!important;width:100%!important}
  #agenda .agenda-overview>div:last-child{display:none!important}
  #agenda .done-panel{display:block!important;width:100%!important;min-width:0!important;margin:0!important;padding:16px 12px 18px 38px!important;border:0!important;border-radius:10px!important;box-shadow:0 3px 14px #0f172a18!important;background-color:#fffef8!important;background-image:linear-gradient(90deg,transparent 0,transparent 26px,#ef9a9a 27px,#ef9a9a 28px,transparent 29px),repeating-linear-gradient(to bottom,transparent 0,transparent 36px,#b7d2ee 37px,transparent 38px)!important}
  #agenda .done-date{font-size:12px!important;font-weight:800!important;color:#6b7280!important;margin:0 0 4px!important}
  #agenda .done-panel>h3{font-size:20px!important;color:#374151!important;margin:0 0 12px!important}
  #agenda .done-item{display:grid!important;grid-template-columns:26px minmax(0,1fr)!important;gap:7px!important;align-items:start!important;background:rgba(255,255,255,.78)!important;border:0!important;border-radius:8px!important;padding:8px 7px!important;margin:0 0 6px!important;box-shadow:0 1px 3px #0000000d!important}
  #agenda .done-item-meta{grid-column:2!important;justify-content:flex-start!important;gap:5px!important}
  #agenda .done-note{font-size:15px!important;line-height:1.35!important;color:#1f2937!important}
  #agenda .task-check{width:20px!important;height:20px!important;margin-top:1px!important}
  #agenda .mini-actions{display:flex!important;gap:4px!important;flex-wrap:wrap!important}
  #agenda .mini-actions .btn,#agenda .agenda-attach-button{padding:5px 7px!important;font-size:12px!important}
  #agenda .inline-agenda-add{display:flex!important;flex-direction:column!important;gap:8px!important;margin:15px 0 0!important;padding:11px!important;background:rgba(255,255,255,.9)!important;border:1px solid #d1d5db!important;border-radius:10px!important;box-shadow:0 2px 8px #00000012!important}
  #agenda .inline-agenda-add>div:first-child{order:1!important;display:grid!important;grid-template-columns:minmax(0,1fr) 42px!important;gap:6px!important}
  #todayInlineNote,#dayInlineNote{min-height:44px!important;font-size:15px!important;background:#fff!important}
  #agenda .agenda-schedule-line{order:2!important;display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:wrap!important;padding:8px 0 0!important;border-top:1px dashed #cbd5e1!important}
  #agenda .agenda-schedule-label{font-size:12px!important;font-weight:900!important;color:#92400e!important}
  #agenda .agenda-schedule-line input[type="number"]{width:62px!important;min-width:0!important;padding:7px 5px!important}
  #agenda .agenda-calendar-button{padding:7px 9px!important}
  #agenda .inline-agenda-add>.green{order:3!important;width:100%!important;padding:11px!important;font-size:15px!important;border-radius:8px!important}
  #agenda .month-calendar,#agenda .month-weekdays,#agenda .month-grid{display:none!important}
  #agenda .agenda-sheet{min-height:0!important;padding:14px 10px 24px 34px!important;border-radius:10px!important}
}
</style>
<script>
(function(){
  function applyColorNoteLook(){
    try{
      var title=document.getElementById('agendaViewTitle');
      if(title)title.textContent='Notlarım';
      var dailyTitle=document.querySelector('#agenda .done-panel>h3');
      if(dailyTitle)dailyTitle.textContent='Notlarım';
      var monthArea=document.querySelector('#agenda .agenda-overview>div:last-child');
      if(monthArea)monthArea.style.display='none';
      var monthControls=document.getElementById('agendaMonthControls');
      if(monthControls)monthControls.style.display='none';
      var dayControls=document.getElementById('agendaDayControls');
      if(dayControls)dayControls.style.display='none';
    }catch(error){console.error('Mobil not görünümü uygulanamadı:',error)}
  }

  function observeAgenda(){
    var days=document.getElementById('agendaDays');
    if(!days||days.__colorNoteObserver)return;
    var observer=new MutationObserver(function(){applyColorNoteLook()});
    observer.observe(days,{childList:true,subtree:true});
    days.__colorNoteObserver=observer;
  }

  function openNormalAgenda(){
    try{
      if(typeof currentAccessRole!=='undefined'&&(currentAccessRole==='graphic'||currentAccessRole==='tracking'))return;
      document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
      var agenda=document.getElementById('agenda');
      if(agenda)agenda.classList.add('active');
      document.querySelectorAll('.menu button').forEach(function(button){button.classList.remove('active')});
      var agendaButton=document.querySelector('.menu button[data-page="agenda"]');
      if(agendaButton)agendaButton.classList.add('active');
      if(typeof showAgendaMonth==='function')showAgendaMonth();
      else if(typeof loadAgenda==='function')loadAgenda();
      setTimeout(function(){applyColorNoteLook();observeAgenda()},120);
    }catch(error){console.error('Mobil Ajanda açılamadı:',error)}
  }

  document.addEventListener('DOMContentLoaded',function(){setTimeout(openNormalAgenda,80)});
  window.addEventListener('load',function(){setTimeout(openNormalAgenda,300)});
  setTimeout(openNormalAgenda,900);
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const isOldMobilePage=isGet&&(url.pathname==='/mobil-ajanda'||url.pathname==='/mobil-ajanda.html');
    const forceMobile=url.searchParams.get('mobile')==='1';
    const mobile=forceMobile||isMobileRequest(request);

    if(isOldMobilePage){
      const target=new URL('/',url.origin);
      target.searchParams.set('mobile','1');
      return Response.redirect(target.toString(),302);
    }

    const response=await worker.fetch(request,env,ctx);
    if(!isHome||!mobile||response.status!==200)return response;

    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('text/html'))return response;

    let html=await response.text();
    if(!html.includes('id="mobileAgendaPatch"')){
      html=html.replace('</body>',mobileAgendaPatch+'\n</body>');
    }

    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
