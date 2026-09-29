(function(){
  'use strict';
  let customerMap=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function refresh(){
    try{
      const rows=typeof req==='function'?await req('/api/customers?status=Tümü'):[];
      customerMap=new Map((rows||[]).map(x=>[Number(x.id),x]));
      render();
    }catch(_){ }
  }

  function idFromRow(row){
    const button=row.querySelector('[onclick*="salesOpenMeeting("]');
    return Number(String(button?.getAttribute('onclick')||'').match(/salesOpenMeeting\((\d+)/)?.[1]||0);
  }

  function render(){
    const head=document.querySelector('#salesCockpit table thead tr');
    if(head&&!head.querySelector('[data-sales-extra="city"]')){
      const first=head.children[0];
      first?.insertAdjacentHTML('afterend','<th data-sales-extra="city">İl</th><th data-sales-extra="area">Yaptığı İş Alanı</th>');
    }
    document.querySelectorAll('#salesRows tr').forEach(row=>{
      if(row.querySelector('[data-sales-extra-cell="city"]'))return;
      const c=customerMap.get(idFromRow(row));if(!c)return;
      const first=row.children[0];if(!first)return;
      first.insertAdjacentHTML('afterend','<td data-sales-extra-cell="city"><b>'+esc(c.city||'—')+'</b><div class="sales-mini">'+esc(c.region||'')+'</div></td><td data-sales-extra-cell="area" style="min-width:260px">'+esc(c.business_area||'—')+'</td>');
    });
  }

  function observe(){
    const body=document.getElementById('salesRows');if(!body||body.dataset.salesExtraObserved)return;
    body.dataset.salesExtraObserved='1';new MutationObserver(render).observe(body,{childList:true,subtree:true});
  }

  function start(){refresh();observe();setInterval(()=>{observe();render()},1000);setInterval(refresh,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
