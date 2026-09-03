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
  body{margin:0!important;overflow-x:hidden!important;background:#eef1f5!important}
  .app{display:block!important;min-height:100vh!important}
  .side{display:none!important}
  .main{padding:0!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}
  .top{display:none!important}
  #agenda{display:block!important;width:100%!important;max-width:100%!important;padding:0 10px 20px!important}

  #agenda>.toolbar{display:block!important;position:relative!important;margin:0 -10px 12px!important;padding:16px 18px 14px 52px!important;background:linear-gradient(135deg,#ffd54f,#ffca28)!important;box-shadow:0 3px 10px #0002!important;border-radius:0 0 15px 15px!important}
  #agenda>.toolbar:before{content:"📝";position:absolute;left:17px;top:12px;font-size:26px}
  #agendaViewTitle{margin:0!important;font-size:24px!important;line-height:1!important;font-weight:900!important;color:#40391f!important}
  #agendaViewSubtitle,#agendaMonthControls,#agendaDayControls{display:none!important}

  #agendaDays{display:block!important;width:100%!important}
  #agenda .agenda-overview{display:none!important}
  #agenda .month-calendar,#agenda .month-weekdays,#agenda .month-grid{display:none!important}

  #agenda .agenda-sheet{display:block!important;position:relative!important;width:100%!important;min-height:calc(100vh - 92px)!important;margin:0!important;padding:18px 12px 24px 40px!important;border:1px solid #e6dfc7!important;border-radius:13px!important;box-shadow:0 5px 18px #0f172a18!important;background-color:#fffef8!important;background-image:linear-gradient(90deg,transparent 0,transparent 27px,#ef9a9a 28px,#ef9a9a 29px,transparent 30px),repeating-linear-gradient(to bottom,transparent 0,transparent 36px,#bdd7ee 37px,transparent 38px)!important;overflow:hidden!important}
  #agenda .agenda-sheet:before{content:""!important;position:absolute!important;left:9px!important;top:16px!important;bottom:16px!important;width:10px!important;border:0!important;background:radial-gradient(circle,#cbd5e1 0 3px,transparent 3.5px) center top/10px 28px repeat-y!important}
  #agenda .agenda-date-heading{margin:0 0 14px!important;padding:0 0 9px!important;text-align:left!important;font-size:15px!important;color:#6b7280!important;border-bottom:1px dashed #d6c98e!important;font-family:inherit!important}

  #agenda .agenda-entry{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important;min-height:0!important;margin:0 0 9px!important;padding:10px!important;background:#fff8c7!important;border:1px solid #f1dc72!important;border-left:5px solid #f2b705!important;border-radius:9px!important;box-shadow:0 2px 6px #00000010!important}
  #agenda .agenda-entry:nth-of-type(4n+2){background:#e8f5e9!important;border-color:#b7dfbc!important;border-left-color:#43a047!important}
  #agenda .agenda-entry:nth-of-type(4n+3){background:#e3f2fd!important;border-color:#b7d9f3!important;border-left-color:#1e88e5!important}
  #agenda .agenda-entry:nth-of-type(4n+4){background:#fce4ec!important;border-color:#efbdce!important;border-left-color:#d81b60!important}
  #agenda .agenda-entry>div:first-child{min-width:0!important}
  #agenda .agenda-note{font-size:15px!important;line-height:1.4!important;color:#1f2937!important;word-break:break-word!important}
  #agenda .agenda-reminder{font-size:12px!important;font-weight:800!important;color:#92400e!important;margin-top:5px!important}
  #agenda .agenda-actions{display:flex!important;justify-content:flex-start!important;gap:5px!important;flex-wrap:wrap!important}
  #agenda .agenda-actions .btn,#agenda .agenda-attach-button{padding:5px 8px!important;font-size:12px!important;border-radius:7px!important}
  #agenda .task-check{width:20px!important;height:20px!important;flex:0 0 20px!important;margin-top:1px!important}
  #agenda .agenda-empty{padding:12px 8px!important;color:#6b7280!important;font-size:14px!important}

  #agenda .inline-agenda-add{display:flex!important;flex-direction:column!important;gap:8px!important;margin:18px 0 0!important;padding:12px!important;background:rgba(255,255,255,.94)!important;border:1px solid #d1d5db!important;border-radius:12px!important;box-shadow:0 3px 10px #00000012!important}
  #agenda .inline-agenda-add:before{content:"＋ YENİ NOT";font-size:11px;font-weight:900;color:#7c6a1b;letter-spacing:.8px;padding-bottom:6px;border-bottom:1px dashed #d6c98e}
  #agenda .inline-agenda-add>div:first-child{order:1!important;display:grid!important;grid-template-columns:minmax(0,1fr) 42px!important;gap:6px!important}
  #dayInlineNote{min-height:54px!important;font-size:15px!important;background-color:#fffef8!important;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,#dbeafe 28px,transparent 29px)!important;border:1px solid #d6c98e!important}
  #agenda .agenda-schedule-line{order:2!important;display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:wrap!important;padding:9px 0 0!important;border-top:1px dashed #cbd5e1!important}
  #agenda .agenda-schedule-label{font-size:12px!important;font-weight:900!important;color:#92400e!important;background:#fff7d6!important;border:1px solid #f4d27d!important;padding:5px 8px!important;border-radius:999px!important}
  #agenda .agenda-schedule-line input[type="number"]{width:62px!important;min-width:0!important;padding:7px 5px!important}
  #agenda .agenda-calendar-button{padding:7px 9px!important}
  #agenda .inline-agenda-add>.green{order:3!important;width:100%!important;padding:12px!important;font-size:15px!important;border-radius:9px!important}
}
</style>
<script>
(function(){
  var mobileAgendaOpening=false;

  function decorateMobileAgenda(){
    var title=document.getElementById('agendaViewTitle');
    if(title)title.textContent='Notlarım';
    var subtitle=document.getElementById('agendaViewSubtitle');
    if(subtitle)subtitle.style.display='none';
    var month=document.getElementById('agendaMonthControls');
    if(month)month.style.display='none';
    var day=document.getElementById('agendaDayControls');
    if(day)day.style.display='none';
  }

  async function openTodayNotes(){
    if(mobileAgendaOpening)return;
    try{
      if(typeof currentAccessRole!=='undefined'&&(currentAccessRole==='graphic'||currentAccessRole==='tracking'))return;
      var agenda=document.getElementById('agenda');
      if(!agenda)return;
      mobileAgendaOpening=true;
      document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
      agenda.classList.add('active');
      document.querySelectorAll('.menu button').forEach(function(button){button.classList.remove('active')});
      var agendaButton=document.querySelector('.menu button[data-page="agenda"]');
      if(agendaButton)agendaButton.classList.add('active');
      agendaView='day';
      agendaDate=new Date();
      decorateMobileAgenda();
      if(typeof loadAgenda==='function')await loadAgenda();
      decorateMobileAgenda();
    }catch(error){
      console.error('Mobil Notlarım açılamadı:',error);
    }finally{
      mobileAgendaOpening=false;
    }
  }

  document.addEventListener('DOMContentLoaded',function(){setTimeout(openTodayNotes,120)});
  window.addEventListener('load',function(){setTimeout(openTodayNotes,450)});
  setTimeout(openTodayNotes,1200);
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
