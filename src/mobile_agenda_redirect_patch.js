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
  body{overflow-x:hidden!important;background:#eef1f5!important}
  .app{display:block!important;min-height:100vh!important}
  .side{display:none!important}
  .main{padding:0!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}
  .top{display:none!important}
  #agenda{display:block!important;width:100%!important;max-width:100%!important;padding:0 10px 22px!important}

  #agenda .toolbar{display:block!important;position:relative!important;margin:0 -10px 12px!important;padding:16px 18px 15px 54px!important;background:linear-gradient(135deg,#ffd54f,#ffca28)!important;box-shadow:0 3px 10px #0002!important;border-radius:0 0 16px 16px!important}
  #agenda .toolbar:before{content:"📝";position:absolute;left:17px;top:13px;font-size:27px;filter:drop-shadow(0 1px 1px #0002)}
  #agenda .toolbar:after{content:"Hızlı not • Hatırlatma • Günlük işler";display:block;margin-top:5px;font-size:11px;font-weight:800;color:#6b5a12;letter-spacing:.2px}
  #agenda .toolbar>div:first-child{width:100%!important}
  #agendaViewTitle{font-size:24px!important;line-height:1!important;text-align:left!important;margin:0!important;color:#3f3a25!important;font-weight:950!important;letter-spacing:.2px}
  #agendaViewSubtitle,#agendaMonthControls,#agendaDayControls{display:none!important}

  #agenda .agenda-overview{display:block!important;width:100%!important}
  #agenda .agenda-overview>div:last-child{display:none!important}
  #agenda .done-panel{display:block!important;position:relative!important;width:100%!important;min-width:0!important;margin:0!important;padding:20px 12px 20px 40px!important;border:1px solid #e8dfbe!important;border-radius:13px!important;box-shadow:0 5px 18px #0f172a18!important;background-color:#fffef8!important;background-image:linear-gradient(90deg,transparent 0,transparent 27px,#ef9a9a 28px,#ef9a9a 29px,transparent 30px),repeating-linear-gradient(to bottom,transparent 0,transparent 36px,#b7d2ee 37px,transparent 38px)!important;overflow:hidden!important}
  #agenda .done-panel:before{content:"";position:absolute;left:9px;top:13px;bottom:13px;width:10px;background:radial-gradient(circle,#cbd5e1 0 3px,transparent 3.5px) center top/10px 28px repeat-y;opacity:.9}
  #agenda .done-panel:after{content:"NOT DEFTERİ";position:absolute;right:10px;top:7px;font-size:9px;font-weight:900;color:#c2a33d;letter-spacing:1.2px}
  #agenda .done-date{font-size:12px!important;font-weight:800!important;color:#6b7280!important;margin:0 0 4px!important}
  #agenda .done-panel>h3{font-size:20px!important;color:#374151!important;margin:0 0 14px!important;padding-bottom:7px!important;border-bottom:1px dashed #d6c98e!important}

  #agenda .done-item{display:grid!important;grid-template-columns:26px minmax(0,1fr)!important;gap:7px!important;align-items:start!important;background:#fff9c9!important;border:1px solid #f3df73!important;border-left:5px solid #f2b705!important;border-radius:9px!important;padding:9px 8px!important;margin:0 0 8px!important;box-shadow:0 2px 6px #00000012!important;transform:rotate(-.15deg)}
  #agenda .done-item:nth-of-type(4n+2){background:#e8f5e9!important;border-color:#b7dfbc!important;border-left-color:#43a047!important;transform:rotate(.12deg)}
  #agenda .done-item:nth-of-type(4n+3){background:#e3f2fd!important;border-color:#b7d9f3!important;border-left-color:#1e88e5!important;transform:rotate(-.08deg)}
  #agenda .done-item:nth-of-type(4n+4){background:#fce4ec!important;border-color:#efbdce!important;border-left-color:#d81b60!important;transform:rotate(.1deg)}
  #agenda .done-item-meta{grid-column:2!important;justify-content:flex-start!important;gap:5px!important}
  #agenda .done-note{font-size:15px!important;line-height:1.4!important;color:#1f2937!important;font-weight:650!important}
  #agenda .task-check{width:20px!important;height:20px!important;margin-top:1px!important}
  #agenda .mini-actions{display:flex!important;gap:4px!important;flex-wrap:wrap!important}
  #agenda .mini-actions .btn,#agenda .agenda-attach-button{padding:5px 7px!important;font-size:12px!important;border-radius:7px!important}
  #agenda .reminder-badge{background:#fff3cd!important;border:1px solid #f5c76b!important;color:#8a5a00!important;border-radius:999px!important;padding:4px 7px!important;font-weight:900!important}

  #agenda .inline-agenda-add{display:flex!important;flex-direction:column!important;gap:8px!important;margin:17px 0 0!important;padding:12px!important;background:rgba(255,255,255,.94)!important;border:1px solid #d1d5db!important;border-radius:12px!important;box-shadow:0 3px 10px #00000014!important}
  #agenda .inline-agenda-add:before{content:"＋ YENİ NOT";font-size:11px;font-weight:950;color:#7c6a1b;letter-spacing:.8px;padding-bottom:5px;border-bottom:1px dashed #d6c98e}
  #agenda .inline-agenda-add>div:first-child{order:1!important;display:grid!important;grid-template-columns:minmax(0,1fr) 42px!important;gap:6px!important}
  #todayInlineNote,#dayInlineNote{min-height:48px!important;font-size:15px!important;background-color:#fffef8!important;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,#dbeafe 28px,transparent 29px)!important;border:1px solid #d6c98e!important}
  #agenda .agenda-schedule-line{order:2!important;display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:wrap!important;padding:9px 0 0!important;border-top:1px dashed #cbd5e1!important}
  #agenda .agenda-schedule-label{font-size:12px!important;font-weight:950!important;color:#92400e!important;background:#fff7d6!important;border:1px solid #f4d27d!important;padding:5px 8px!important;border-radius:999px!important}
  #agenda .agenda-schedule-line input[type="number"]{width:62px!important;min-width:0!important;padding:7px 5px!important}
  #agenda .agenda-calendar-button{padding:7px 9px!important}
  #agenda .inline-agenda-add>.green{order:3!important;width:100%!important;padding:12px!important;font-size:15px!important;border-radius:9px!important;box-shadow:0 2px 6px #04785733!important}

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
