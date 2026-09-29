(function(){
  'use strict';
  let customerMap=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
  const parseList=value=>{try{const x=JSON.parse(value||'[]');return Array.isArray(x)?x:[]}catch{return []}};
  const categories=value=>String(value||'').split(',').map(x=>x.trim()).filter(Boolean);

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

  function phones(c){const x=parseList(c.phones_json);if(!x.length&&c.phone)x.push(c.phone);return x.filter(Boolean)}
  function emails(c){const x=parseList(c.emails_json);if(!x.length&&c.email)x.push(c.email);return x.filter(Boolean)}

  async function saveArea(id,input){
    const c=customerMap.get(Number(id));if(!c||!input)return;
    const next=String(input.value||'').trim();
    if(next===String(c.business_area||'').trim())return;
    input.disabled=true;
    try{
      const response=await fetch('/api/customers/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({
        company:c.company||'',contact_name:c.contact_name||'',phones:phones(c),emails:emails(c),region:c.region||'',city:c.city||'',business_area:next,website:c.website||'',
        priority:c.priority||'NORMAL',stage:c.stage||'Yeni Lead',follow_date:c.follow_date||'',categories:categories(c.categories||c.sector||''),special_notes:c.special_notes||'',machine_info:c.machine_info||'',
        invoice_title:c.invoice_title||'',tax_office:c.tax_office||'',tax_number:c.tax_number||'',invoice_address:c.invoice_address||'',note_image_data:c.note_image_data||''
      })});
      if(!response.ok){let d={};try{d=await response.json()}catch{}throw new Error(d.error||'Kaydedilemedi')}
      c.business_area=next;
      input.value=next;
      input.style.borderColor='#22c55e';
      setTimeout(()=>{input.style.borderColor='#cbd5e1'},900);
    }catch(e){
      input.value=c.business_area||'';
      input.style.borderColor='#dc2626';
      alert('İş alanı kaydedilemedi: '+e.message);
    }finally{input.disabled=false}
  }

  function render(){
    const head=document.querySelector('#salesCockpit table thead tr');
    if(head&&!head.querySelector('[data-sales-extra="city"]')){
      const first=head.children[0];
      first?.insertAdjacentHTML('afterend','<th data-sales-extra="city">İl</th><th data-sales-extra="area" style="width:180px;min-width:180px">Yaptığı İş Alanı</th>');
    }
    document.querySelectorAll('#salesRows tr').forEach(row=>{
      const id=idFromRow(row),c=customerMap.get(id);if(!c)return;
      let cityCell=row.querySelector('[data-sales-extra-cell="city"]');
      let areaCell=row.querySelector('[data-sales-extra-cell="area"]');
      const first=row.children[0];if(!first)return;
      if(!cityCell){
        first.insertAdjacentHTML('afterend','<td data-sales-extra-cell="city"><b>'+esc(c.city||'—')+'</b><div class="sales-mini">'+esc(c.region||'')+'</div></td><td data-sales-extra-cell="area" style="width:180px;min-width:180px"></td>');
        areaCell=row.querySelector('[data-sales-extra-cell="area"]');
      }
      if(areaCell&&!areaCell.querySelector('input')){
        areaCell.innerHTML='<input class="sales-area-input" value="'+esc(c.business_area||'')+'" placeholder="Sen yaz..." title="İş alanını yaz" style="width:165px;max-width:165px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font-size:12px" onchange="salesSaveBusinessArea('+id+',this)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}">';
      }
    });
  }

  function observe(){
    const body=document.getElementById('salesRows');if(!body||body.dataset.salesExtraObserved)return;
    body.dataset.salesExtraObserved='1';new MutationObserver(render).observe(body,{childList:true,subtree:true});
  }

  window.salesSaveBusinessArea=saveArea;
  function start(){refresh();observe();setInterval(()=>{observe();render()},1000);setInterval(refresh,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
