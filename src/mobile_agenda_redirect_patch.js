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
  body{overflow-x:hidden!important}
  .app{display:block!important;min-height:100vh!important}
  .side{display:none!important}
  .main{padding:8px!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}
  .top{display:none!important}
  #agenda{width:100%!important;max-width:100%!important}
  #agenda .toolbar{margin:4px 0 8px!important;gap:6px!important}
  #agenda .agenda-overview{grid-template-columns:1fr!important;gap:10px!important}
  #agenda .done-panel{width:100%!important;min-width:0!important}
  #agenda .agenda-sheet{min-height:0!important;padding:14px 10px 24px 34px!important;border-radius:10px!important}
  #agenda .agenda-sheet:before{left:24px!important}
  #agenda .agenda-entry{grid-template-columns:minmax(0,1fr)!important;gap:5px!important}
  #agenda .agenda-actions{grid-column:1!important;justify-content:flex-start!important}
  #agenda .agenda-note{font-size:14px!important}
  #agenda .agenda-date-heading{font-size:19px!important;margin-bottom:12px!important}
  #agenda .inline-agenda-add{grid-template-columns:1fr!important;gap:6px!important}
  #agenda .month-calendar{width:100%!important;overflow:hidden!important}
  #agenda .month-grid{width:100%!important}
  #agenda .month-day{min-width:0!important;min-height:58px!important;height:auto!important;padding:4px!important}
  #agenda .month-day-note{display:none!important}
  #agenda .month-weekdays div{font-size:10px!important;padding:6px 1px!important}
  #agenda .month-day-number{font-size:14px!important}
}
</style>
<script>
(function(){
  function openNormalAgenda(){
    try{
      if(typeof currentAccessRole!=='undefined'&&(currentAccessRole==='graphic'||currentAccessRole==='tracking'))return;
      document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
      var agenda=document.getElementById('agenda');
      if(agenda)agenda.classList.add('active');
      document.querySelectorAll('.menu button').forEach(function(button){button.classList.remove('active')});
      var agendaButton=document.querySelector('.menu button[data-page="agenda"]');
      if(agendaButton)agendaButton.classList.add('active');
      var title=document.getElementById('title');
      if(title)title.textContent='Ajanda';
      if(typeof showAgendaMonth==='function')showAgendaMonth();
      else if(typeof loadAgenda==='function')loadAgenda();
    }catch(error){console.error('Mobil Ajanda açılamadı:',error)}
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(openNormalAgenda,50)});
  window.addEventListener('load',function(){setTimeout(openNormalAgenda,250)});
  setTimeout(openNormalAgenda,800);
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
