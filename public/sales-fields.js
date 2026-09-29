(function(){
  'use strict';
  let customerMap=new Map();
  const AREA_OPTIONS=['KARTON','OLUKLU','PVC','CONTA','OTOMOTİV','ETİKET'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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

  function selectedAreas(value){
    const raw=String(value||'').toLocaleUpperCase('tr-TR');
    return new Set(AREA_OPTIONS.filter(opt=>{
      if(opt==='OTOMOTİV')return raw.includes('OTOMOTİV')||raw.includes('OTOMOTIV')||raw.includes('OTOMOTIC');
      if(opt==='ETİKET')return raw.includes('ETİKET')||raw.includes('ETIKET');
      return raw.includes(opt);
    }));
  }

  async function saveAreas(id,cell){
    const c=customerMap.get(Number(id));if(!c||!cell)return;
    const checks=[...cell.querySelectorAll('input[type="checkbox"][data-area-value]')];
    const selected=checks.filter(x=>x.checked).map(x=>x.dataset.areaValue);
    const next=selected.join(', ');
    checks.forEach(x=>x.disabled=true);
    try{
      const response=await fetch('/api/customers/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({
        company:c.company||'',contact_name:c.contact_name||'',phones:phones(c),emails:emails(c),region:c.region||'',city:c.city||'',business_area:next,website:c.website||'',
        priority:c.priority||'NORMAL',stage:c.stage||'Yeni Lead',follow_date:c.follow_date||'',categories:categories(c.categories||c.sector||''),special_notes:c.special_notes||'',machine_info:c.machine_info||'',
        invoice_title:c.invoice_title||'',tax_office:c.tax_office||'',tax_number:c.tax_number||'',invoice_address:c.invoice_address||'',note_image_data:c.note_image_data||''
      })});
      if(!response.ok){let d={};try{d=await response.json()}catch{}throw new Error(d.error||'Kaydedilemedi')}
      c.business_area=next;
      cell.style.outline='2px solid #22c55e';
      setTimeout(()=>{cell.style.outline='none'},700);
    }catch(e){
      alert('İş alanı kaydedilemedi: '+e.message);
      renderAreaCell(cell,c,id,true);
    }finally{checks.forEach(x=>x.disabled=false)}
  }

  function renderAreaCell(cell,c,id,force=false){
    if(!cell||(!force&&cell.querySelector('[data-area-options]')))return;
    const selected=selectedAreas(c.business_area);
    cell.innerHTML='<div data-area-options style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;min-width:205px">'+AREA_OPTIONS.map(opt=>{
      const checked=selected.has(opt)?' checked':'';
      return '<label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer"><input type="checkbox" data-area-value="'+esc(opt)+'"'+checked+' onchange="salesToggleBusinessArea('+id+',this.closest(\'td\'))" style="width:14px;height:14px;accent-color:#2563eb">'+esc(opt)+'</label>';
    }).join('')+'</div>';
  }

  function render(){
    const head=document.querySelector('#salesCockpit table thead tr');
    if(head&&!head.querySelector('[data-sales-extra="city"]')){
      const first=head.children[0];
      first?.insertAdjacentHTML('afterend','<th data-sales-extra="city">İl</th><th data-sales-extra="area" style="width:220px;min-width:220px">Yaptığı İş Alanı</th>');
    }
    document.querySelectorAll('#salesRows tr').forEach(row=>{
      const id=idFromRow(row),c=customerMap.get(id);if(!c)return;
      let cityCell=row.querySelector('[data-sales-extra-cell="city"]');
      let areaCell=row.querySelector('[data-sales-extra-cell="area"]');
      const first=row.children[0];if(!first)return;
      if(!cityCell){
        first.insertAdjacentHTML('afterend','<td data-sales-extra-cell="city"><b>'+esc(c.city||'—')+'</b><div class="sales-mini">'+esc(c.region||'')+'</div></td><td data-sales-extra-cell="area" style="width:220px;min-width:220px"></td>');
        areaCell=row.querySelector('[data-sales-extra-cell="area"]');
      }
      renderAreaCell(areaCell,c,id);
    });
  }

  function observe(){
    const body=document.getElementById('salesRows');if(!body||body.dataset.salesExtraObserved)return;
    body.dataset.salesExtraObserved='1';new MutationObserver(render).observe(body,{childList:true,subtree:true});
  }

  window.salesToggleBusinessArea=saveAreas;
  function start(){refresh();observe();setInterval(()=>{observe();render()},1000);setInterval(refresh,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
