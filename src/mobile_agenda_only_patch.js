import worker from './ali_ajanda_only_force_patch.js';

const mobileAgendaOnlyPatch = `
<style>
  @media (max-width:820px){
    body.mobile-agenda-only .app{display:block!important;min-height:100vh!important}
    body.mobile-agenda-only .side{display:none!important}
    body.mobile-agenda-only .main{padding:10px!important;width:100%!important;max-width:none!important;overflow-x:hidden!important}
    body.mobile-agenda-only .top{display:none!important}
    body.mobile-agenda-only .section{display:none!important}
    body.mobile-agenda-only #agenda{display:block!important;width:100%!important;margin:0!important}

    body.mobile-agenda-only #agenda .toolbar{display:flex!important;gap:8px!important;align-items:flex-start!important}
    body.mobile-agenda-only.mobile-agenda-loaded #agenda .toolbar{display:none!important}

    body.mobile-agenda-only #agenda .agenda-overview{display:block!important;width:100%!important}
    body.mobile-agenda-only #agenda .agenda-overview>div{display:none!important}
    body.mobile-agenda-only #agenda .done-panel{display:block!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0!important}

    body.mobile-agenda-only #agenda .inline-agenda-add{grid-template-columns:1fr!important;gap:8px!important;width:100%!important}
    body.mobile-agenda-only #agenda .inline-agenda-add>div{grid-template-columns:minmax(0,1fr) auto!important}
    body.mobile-agenda-only #agenda input,
    body.mobile-agenda-only #agenda textarea{font-size:16px!important;min-width:0!important}
    body.mobile-agenda-only #agenda .done-item{grid-template-columns:25px minmax(0,1fr) auto!important;gap:7px!important}
    body.mobile-agenda-only #agenda .done-item-meta{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;flex-wrap:wrap!important}
    body.mobile-agenda-only #agenda h2,
    body.mobile-agenda-only #agenda h3{margin-top:8px!important}

    body.mobile-agenda-only .mobile-agenda-loading{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:18px;font-weight:800;color:#047857}
    body.mobile-agenda-only .mobile-agenda-error{background:#fff7ed;border:1px solid #fdba74;border-radius:14px;padding:18px;color:#9a3412;font-weight:800}
  }
</style>
<script>
(function(){
  function isPhone(){return window.matchMedia&&window.matchMedia('(max-width:820px)').matches}

  function renderFallback(text,isError){
    var days=document.getElementById('agendaDays');
    if(!days)return;
    days.innerHTML='<div class="'+(isError?'mobile-agenda-error':'mobile-agenda-loading')+'">'+text+'</div>';
  }

  function ensureDailyAgenda(attempt){
    if(!isPhone())return;
    attempt=attempt||0;

    var existing=document.querySelector('#agenda .done-panel');
    if(existing){
      document.body.classList.add('mobile-agenda-loaded');
      return;
    }

    if(typeof loadAgenda!=='function'){
      if(attempt<8)return setTimeout(function(){ensureDailyAgenda(attempt+1)},250);
      renderFallback('Günlük not alanı yüklenemedi. Sayfayı bir kez yenileyin.',true);
      return;
    }

    try{
      if(typeof agendaDate!=='undefined')agendaDate=new Date();
      if(typeof agendaView!=='undefined')agendaView='month';
      var result=loadAgenda();
      Promise.resolve(result).then(function(){
        setTimeout(function(){
          var panel=document.querySelector('#agenda .done-panel');
          if(panel){
            document.body.classList.add('mobile-agenda-loaded');
          }else if(attempt<5){
            ensureDailyAgenda(attempt+1);
          }else{
            renderFallback('Günlük not alanı yüklenemedi. Sayfayı yenileyip tekrar deneyin.',true);
          }
        },80);
      }).catch(function(){
        var panel=document.querySelector('#agenda .done-panel');
        if(panel){document.body.classList.add('mobile-agenda-loaded');return;}
        if(attempt<5)setTimeout(function(){ensureDailyAgenda(attempt+1)},300);
        else renderFallback('Notlar alınamadı. İnternet bağlantısını kontrol edip sayfayı yenileyin.',true);
      });
    }catch(_){
      if(attempt<5)setTimeout(function(){ensureDailyAgenda(attempt+1)},300);
      else renderFallback('Günlük not alanı açılamadı. Sayfayı yenileyin.',true);
    }
  }

  function showAgendaOnly(role){
    if(role!=='admin'||!isPhone())return;
    document.body.classList.add('mobile-agenda-only');
    document.body.classList.remove('mobile-agenda-loaded');
    document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
    var agenda=document.getElementById('agenda');
    if(agenda)agenda.classList.add('active');
    var title=document.getElementById('title');
    if(title)title.textContent='Ajanda';
    renderFallback('Günlük notlar yükleniyor...',false);
    ensureDailyAgenda(0);
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
    if(!isPhone()){
      document.body.classList.remove('mobile-agenda-only');
      document.body.classList.remove('mobile-agenda-loaded');
    }else{
      fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(session){if(session)showAgendaOnly(session.role)}).catch(function(){});
    }
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