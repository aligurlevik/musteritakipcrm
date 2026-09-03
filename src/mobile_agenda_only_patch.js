import worker from './ali_ajanda_only_force_patch.js';

const mobileAgendaOnlyPatch = `
<style>
@media (max-width:820px){
  body.mobile-agenda-only{margin:0!important;background:#dff4e4!important;color:#0f172a!important;overflow-x:hidden!important}
  body.mobile-agenda-only>.app{display:none!important}
  body.mobile-agenda-only>#aliAgendaPhoneRoot{display:block!important;min-height:100vh!important;background:#dff4e4!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-shell{max-width:none!important;margin:0!important;padding:10px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-head{display:none!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-shell>.aa-card:first-of-type{display:none!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-shell>.aa-card:last-of-type{
    display:block!important;
    width:100%!important;
    min-height:calc(100vh - 20px)!important;
    margin:0!important;
    border:1px solid #8fc9a0!important;
    border-radius:14px!important;
    padding:16px!important;
    background-color:#eaf8ed!important;
    background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 39px,rgba(33,120,68,.20) 40px)!important;
    box-shadow:0 8px 24px rgba(20,83,45,.12)!important;
  }
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-selected-title{font-size:18px!important;color:#065f46!important;margin-bottom:14px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-note-list{gap:7px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-note{background:rgba(255,255,255,.88)!important;border-left-color:#059669!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-add{margin-top:16px!important;background:rgba(234,248,237,.88)!important;border-top:1px dashed #5da875!important;padding:12px!important;border-radius:10px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-add textarea{min-height:92px!important;background:rgba(255,255,255,.92)!important;font-size:16px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-time-row{grid-template-columns:1fr 72px 72px!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-time-row input{font-size:16px!important;background:rgba(255,255,255,.92)!important}
  body.mobile-agenda-only #aliAgendaPhoneRoot .aa-addbtn{font-size:16px!important;padding:12px 14px!important}
}
</style>
<script>
(function(){
  function isPhone(){return window.matchMedia&&window.matchMedia('(max-width:820px)').matches}
  function localKey(){
    var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }
  function openPhoneNotes(role){
    if(role!=='admin'||!isPhone())return;
    document.body.classList.add('mobile-agenda-only');
    function loadDirect(){
      try{
        if(typeof window.aaChangeMonth==='function'&&typeof window.aaSelectDate==='function'){
          window.aaChangeMonth(0);
          window.aaSelectDate(localKey());
        }
      }catch(_){ }
    }
    loadDirect();
    setTimeout(loadDirect,250);
    setTimeout(function(){try{window.aaSelectDate(localKey())}catch(_){}},700);
  }
  function sync(){
    fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(s){if(s)openPhoneNotes(s.role)}).catch(function(){});
  }
  sync();
  window.addEventListener('load',function(){setTimeout(sync,80)});
  window.addEventListener('resize',function(){if(!isPhone())document.body.classList.remove('mobile-agenda-only');else sync()});
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('openPhoneNotes(role)'))html=html.replace('</body>',mobileAgendaOnlyPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};