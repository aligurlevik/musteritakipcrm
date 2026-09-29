(function(){
  'use strict';
  let customerMap=new Map();
  let patched=false;
  let originalFetch=window.fetch.bind(window);

  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

  function ensureFormFields(){
    if(document.getElementById('c_city'))return;
    const region=document.getElementById('c_region');
    const row=region?.closest('.field-row');
    if(!row)return;
    row.insertAdjacentHTML('afterend',
      '<div class="field-row"><label>İl</label><input id="c_city" placeholder="Örn: Ankara"></div>'+ 
      '<div><label style="font-size:13px;font-weight:700">Yaptığı İş Alanı</label><textarea id="c_business_area" rows="3" placeholder="Örn: Ofset baskılı karton kutu, ilaç kutusu, kazanlı kesim"></textarea></div>'+ 
      '<div class="field-row"><label>Web Sitesi</label><input id="c_website" placeholder="https://..."></div>'
    );
  }

  function fillExtraFields(customer){
    ensureFormFields();
    const city=document.getElementById('c_city'),area=document.getElementById('c_business_area'),web=document.getElementById('c_website');
    if(city)city.value=customer?.city||'';
    if(area)area.value=customer?.business_area||'';
    if(web)web.value=customer?.website||'';
  }

  function clearExtraFields(){fillExtraFields({})}

  function installFetchPatch(){
    if(window.__salesFieldFetchPatched)return;
    window.__salesFieldFetchPatched=true;
    window.fetch=async function(input,init){
      let nextInit=init;
      try{
        const url=typeof input==='string'?input:(input?.url||'');
        const method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();
        const customerModal=document.getElementById('customerModal');
        const editingCustomer=customerModal?.classList.contains('open');
        if(editingCustomer&&(method==='POST'||method==='PUT')&&/^\/api\/customers(?:\/\d+)?$/.test(new URL(url,location.origin).pathname)&&init?.body){
          const data=JSON.parse(init.body);
          data.city=document.getElementById('c_city')?.value.trim()||'';
          data.business_area=document.getElementById('c_business_area')?.value.trim()||'';
          data.website=document.getElementById('c_website')?.value.trim()||'';
          nextInit={...init,body:JSON.stringify(data)};
        }
      }catch(_){ }
      return originalFetch(input,nextInit);
    };
  }

  function installCustomerPatches(){
    if(patched)return;
    if(typeof window.editCustomer!=='function'||typeof window.clearCustomerForm!=='function')return;
    patched=true;
    const originalEdit=window.editCustomer;
    const originalClear=window.clearCustomerForm;
    window.editCustomer=function(id){
      originalEdit(id);
      try{
        const item=(typeof allCustomers!=='undefined'?allCustomers:[]).find(x=>Number(x.id)===Number(id));
        fillExtraFields(item||customerMap.get(Number(id))||{});
      }catch(_){fillExtraFields(customerMap.get(Number(id))||{})}
    };
    window.clearCustomerForm=function(){originalClear();clearExtraFields()};
  }

  async function refreshCustomerMap(){
    try{
      const rows=typeof req==='function'?await req('/api/customers?status=Tümü'):[];
      customerMap=new Map((rows||[]).map(x=>[Number(x.id),x]));
      renderExtraColumns();
    }catch(_){ }
  }

  function ensureCustomerHeaders(){
    const head=document.querySelector('#customers table thead tr');if(!head||head.querySelector('[data-extra="city"]'))return;
    const ths=[...head.children];
    const regionTh=ths.find(th=>th.textContent.trim()==='Bölge');
    if(!regionTh)return;
    regionTh.insertAdjacentHTML('afterend','<th data-extra="city">İl</th><th data-extra="area">Yaptığı İş Alanı</th>');
  }

  function ensureSalesHeaders(){
    const head=document.querySelector('#salesCockpit table thead tr');if(!head||head.querySelector('[data-extra="city"]'))return;
    const first=head.children[0];if(!first)return;
    first.insertAdjacentHTML('afterend','<th data-extra="city">İl</th><th data-extra="area">Yaptığı İş Alanı</th>');
  }

  function customerIdFromRow(row){
    const select=row.querySelector('.customer-action-select');
    return Number(String(select?.getAttribute('onchange')||'').match(/handleCustomerAction\((\d+)/)?.[1]||0);
  }

  function salesIdFromRow(row){
    const button=row.querySelector('[onclick*="salesOpenMeeting("]');
    return Number(String(button?.getAttribute('onclick')||'').match(/salesOpenMeeting\((\d+)/)?.[1]||0);
  }

  function renderCustomerExtras(){
    ensureCustomerHeaders();
    document.querySelectorAll('#customerRows tr').forEach(row=>{
      if(row.querySelector('[data-extra-cell="city"]'))return;
      const id=customerIdFromRow(row),c=customerMap.get(id);if(!c)return;
      const regionCell=row.children[5];if(!regionCell)return;
      regionCell.insertAdjacentHTML('afterend','<td data-extra-cell="city">'+esc(c.city||'—')+'</td><td data-extra-cell="area" style="min-width:220px">'+esc(c.business_area||'—')+'</td>');
    });
  }

  function renderSalesExtras(){
    ensureSalesHeaders();
    document.querySelectorAll('#salesRows tr').forEach(row=>{
      if(row.querySelector('[data-extra-cell="city"]'))return;
      const id=salesIdFromRow(row),c=customerMap.get(id);if(!c)return;
      const first=row.children[0];if(!first)return;
      first.insertAdjacentHTML('afterend','<td data-extra-cell="city"><b>'+esc(c.city||'—')+'</b><div class="sales-mini">'+esc(c.region||'')+'</div></td><td data-extra-cell="area" style="min-width:260px">'+esc(c.business_area||'—')+'</td>');
    });
  }

  function renderExtraColumns(){renderCustomerExtras();renderSalesExtras()}

  function observeTables(){
    for(const id of ['customerRows','salesRows']){
      const el=document.getElementById(id);if(!el||el.dataset.extraObserved)return;
      el.dataset.extraObserved='1';new MutationObserver(()=>renderExtraColumns()).observe(el,{childList:true,subtree:true});
    }
  }

  function start(){
    ensureFormFields();installFetchPatch();installCustomerPatches();observeTables();refreshCustomerMap();
    setInterval(()=>{ensureFormFields();installCustomerPatches();observeTables();renderExtraColumns()},1000);
    setInterval(refreshCustomerMap,30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
