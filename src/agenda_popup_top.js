import worker from './temporary_d1_backup.js';

const POPUP_INJECT = String.raw`
<style id="agendaPopupStyle">
/* Ajanda başlığına basınca açıklamayı gerçek pencere gibi göster */
.agenda-inline-detail{
  position:fixed!important;
  left:50%!important;
  top:50%!important;
  transform:translate(-50%,-50%)!important;
  width:min(640px,92vw)!important;
  max-height:84vh!important;
  overflow:auto!important;
  margin:0!important;
  padding:22px!important;
  background:#fff!important;
  border:1px solid #cbd5e1!important;
  border-left:6px solid #2563eb!important;
  border-radius:16px!important;
  box-shadow:0 0 0 100vmax rgba(15,23,42,.62),0 28px 90px rgba(15,23,42,.38)!important;
  z-index:220!important;
}
.agenda-inline-detail.open{display:block!important}
.agenda-inline-detail:before{
  content:'NOT / AÇIKLAMA';
  display:block;
  margin-bottom:10px;
  color:#1e3a8a;
  font-size:13px;
  font-weight:1000;
  letter-spacing:.04em;
}
.agenda-inline-detail-text{
  min-height:90px!important;
  padding:14px 16px!important;
  background:#f8fafc!important;
  border:1px solid #e2e8f0!important;
  border-radius:11px!important;
  font-size:16px!important;
  line-height:1.65!important;
}
.agenda-inline-detail-meta{margin-top:12px!important}
.agenda-inline-detail-actions{margin-top:14px!important}
.agenda-inline-detail-actions .btn{padding:9px 13px!important}
.agenda-inline-edit textarea{min-height:170px!important}
@media(max-width:700px){
  .agenda-inline-detail{width:94vw!important;max-height:88vh!important;padding:17px!important}
  .agenda-inline-detail-text{font-size:15px!important}
}
</style>
<script id="agendaPopupScript">
(function(){
  if(window.__agendaPopupLoaded)return;
  window.__agendaPopupLoaded=true;
  document.addEventListener('keydown',function(event){
    if(event.key!=='Escape')return;
    var panel=document.querySelector('.agenda-inline-detail.open');
    if(!panel)return;
    var id=Number(panel.getAttribute('data-agenda-id'));
    if(id&&typeof window.closeAgendaDetail==='function')window.closeAgendaDetail(id);
  });
})();
</script>`;

function rebuilt(response,html){
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
    const copy=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('agendaTitleDetailScript')||html.includes('agendaPopupStyle'))return rebuilt(response,html);
      const next=html.includes('</body>')?html.replace('</body>',POPUP_INJECT+'\n</body>'):html+POPUP_INJECT;
      return rebuilt(response,next);
    }catch(error){
      console.error('Agenda popup injection failed',error);
      return copy;
    }
  }
};
