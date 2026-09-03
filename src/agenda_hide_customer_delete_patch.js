import worker from './agenda_selected_day_safe_patch.js';

const agendaUiPatch = `
<style>
  /* Ajanda notlarindaki sil komutunu daha belirgin yap. */
  #agenda .agenda-actions .agenda-note-delete,
  #agenda .mini-actions .agenda-note-delete{
    background:#dc2626!important;
    color:#fff!important;
    border:0!important;
    font-weight:1000!important;
    padding:7px 11px!important;
    border-radius:8px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
</style>
<script>
(function(){
  function syncAgendaTopButton(){
    var agenda=document.getElementById('agenda');
    var newCustomer=document.querySelector('.top .primary');
    if(!newCustomer)return;
    if(agenda&&agenda.classList.contains('active'))newCustomer.style.display='none';
  }

  function decorateAgendaDeleteButtons(){
    document.querySelectorAll('#agenda button[onclick^="deleteAgendaEntry("]').forEach(function(btn){
      btn.classList.add('agenda-note-delete');
      btn.textContent='SİL';
      btn.title='Bu notu sil';
    });
  }

  function syncAgendaUi(){
    syncAgendaTopButton();
    decorateAgendaDeleteButtons();
  }

  document.addEventListener('click',function(){setTimeout(syncAgendaUi,0)});
  window.addEventListener('load',syncAgendaUi);

  var observer=new MutationObserver(syncAgendaUi);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});syncAgendaUi()});
  }else{
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    syncAgendaUi();
  }
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('decorateAgendaDeleteButtons'))html=html.replace('</body>',agendaUiPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
