import worker from './ali_ajanda_only_force_patch.js';

const mobileAgendaOnlyPatch = `
<style>
@media (max-width:820px){
  body.mobile-agenda-only{background:#dff4e4!important}
  body.mobile-agenda-only .app{display:block!important;min-height:100vh!important}
  body.mobile-agenda-only .side{display:none!important}
  body.mobile-agenda-only .main{padding:10px!important;width:100%!important;max-width:none!important;overflow-x:hidden!important;background:#dff4e4!important}
  body.mobile-agenda-only .top{display:none!important}
  body.mobile-agenda-only .section{display:none!important}
  body.mobile-agenda-only #agenda{display:block!important;width:100%!important;margin:0!important}
  body.mobile-agenda-only #agenda .toolbar{display:none!important}

  body.mobile-agenda-only #agenda .agenda-overview{display:block!important;width:100%!important}
  body.mobile-agenda-only #agenda .agenda-overview>div{display:none!important}
  body.mobile-agenda-only #agenda .done-panel{
    display:block!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0!important;
    min-height:calc(100vh - 20px)!important;border:1px solid #8fc9a0!important;border-radius:14px!important;padding:16px!important;
    background-color:#eaf8ed!important;
    background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 39px,rgba(33,120,68,.20) 40px)!important;
    box-shadow:0 8px 24px rgba(20,83,45,.12)!important;
  }
  body.mobile-agenda-only #agenda .inline-agenda-add{grid-template-columns:1fr!important;gap:8px!important;width:100%!important;background:rgba(234,248,237,.85)!important}
  body.mobile-agenda-only #agenda .inline-agenda-add>div{grid-template-columns:minmax(0,1fr) auto!important}
  body.mobile-agenda-only #agenda input,body.mobile-agenda-only #agenda textarea{font-size:16px!important;min-width:0!important}
  body.mobile-agenda-only #agenda .done-item{grid-template-columns:25px minmax(0,1fr) auto!important;gap:7px!important;background:rgba(255,255,255,.82)!important}
  body.mobile-agenda-only #agenda .done-item.task-done{background:rgba(254,226,226,.9)!important}
  body.mobile-agenda-only #agenda .done-item-meta{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;flex-wrap:wrap!important}
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
    var wrappedApplyAccess=function(role){var result=originalApplyAccess.apply(this,arguments);showAgendaOnly(role);return result};
    wrappedApplyAccess.__mobileAgendaWrapped=true;
    window.applyAccess=wrappedApplyAccess;
  }
  fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(session){if(session)showAgendaOnly(session.role)}).catch(function(){});
  window.addEventListener('resize',function(){if(!isPhone())document.body.classList.remove('mobile-agenda-only')});
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