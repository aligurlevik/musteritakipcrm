import worker from './agenda_hide_customer_delete_patch.js';

const mobileAgendaOnlyPatch = `
<style>
  @media (max-width:820px){
    body.mobile-agenda-only .app{display:block!important;min-height:100vh!important}
    body.mobile-agenda-only .side{display:none!important}
    body.mobile-agenda-only .main{padding:10px!important;width:100%!important;max-width:none!important;overflow-x:hidden!important}
    body.mobile-agenda-only .top{display:none!important}
    body.mobile-agenda-only .section{display:none!important}
    body.mobile-agenda-only #agenda{display:block!important;width:100%!important;margin:0!important}
    body.mobile-agenda-only #agenda .toolbar{gap:8px!important;align-items:flex-start!important}
    body.mobile-agenda-only #agenda .agenda-overview{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;width:100%!important}
    body.mobile-agenda-only #agenda .done-panel{width:100%!important;min-width:0!important}
    body.mobile-agenda-only #agenda .month-calendar{width:100%!important;min-width:0!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}
    body.mobile-agenda-only #agenda .month-weekdays,
    body.mobile-agenda-only #agenda .month-grid{min-width:560px!important}
    body.mobile-agenda-only #agenda .inline-agenda-add{grid-template-columns:1fr!important;gap:8px!important}
    body.mobile-agenda-only #agenda .agenda-schedule-line{display:flex!important;flex-wrap:wrap!important;gap:6px!important}
    body.mobile-agenda-only #agenda h2,
    body.mobile-agenda-only #agenda h3{margin-top:8px!important}
  }
</style>
<script>
(function(){
  function isPhone(){return window.matchMedia&&window.matchMedia('(max-width:820px)').matches}

  function showAgendaOnly(role){
    if(role!=='admin'||!isPhone())return;
    document.body.classList.add('mobile-agenda-only');
    document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
    var agenda=document.getElementById('agenda');
    if(agenda)agenda.classList.add('active');
    var title=document.getElementById('title');
    if(title)title.textContent='Ajanda';
  }

  if(typeof window.applyAccess==='function'&&!window.applyAccess.__mobileAgendaWrapped){
    var originalApplyAccess=window.applyAccess;
    var wrappedApplyAccess=function(role){
      var result=originalApplyAccess.apply(this,arguments);
      showAgendaOnly(role);
      return result;
    };
    wrappedApplyAccess.__mobileAgendaWrapped=true;
    window.applyAccess=wrappedApplyAccess;
  }

  fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(session){if(session)showAgendaOnly(session.role)}).catch(function(){});

  window.addEventListener('resize',function(){
    if(!isPhone())document.body.classList.remove('mobile-agenda-only');
    else fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(session){if(session)showAgendaOnly(session.role)}).catch(function(){});
  });
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('__mobileAgendaWrapped'))html=html.replace('</body>',mobileAgendaOnlyPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
