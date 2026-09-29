(function(){
  'use strict';

  const customerCache=new Map();
  const originalFetch=window.fetch.bind(window);
  let currentCustomerKey='__none__';
  let loadingCustomers=false;

  const $=id=>document.getElementById(id);
  const clean=value=>String(value||'').trim();
  const parse=(value,fallback)=>{try{return JSON.parse(value)}catch(_){return fallback}};

  function injectStyle(){
    if($('customerExtendedStyle'))return;
    const style=document.createElement('style');
    style.id='customerExtendedStyle';
    style.textContent=`
      .customer-card-box{width:min(1480px,98vw)!important}
      .customer-card-grid{grid-template-columns:minmax(680px,1.65fr) minmax(300px,.72fr) minmax(350px,.9fr)!important}
      .customer-contact-list{overflow-x:auto;padding-bottom:3px}
      .customer-contact-head,.customer-contact-row{display:grid!important;grid-template-columns:30px minmax(135px,1.12fr) minmax(120px,.9fr) minmax(130px,.95fr) minmax(190px,1.25fr)!important;gap:7px!important;align-items:center!important;min-width:690px}
      .customer-contact-head{color:#64748b;font-size:11px;font-weight:800}
      .customer-contact-row input{min-width:0;font-size:12px}
      .customer-extra-block{border:1px solid #dbe2ea;border-radius:10px;padding:10px;background:#f8fafc}
      .customer-extra-block>label:first-child{display:flex;align-items:center;gap:7px;font-weight:800;margin-bottom:7px}
      .customer-extra-block input[type=checkbox]{width:auto}
      .customer-extra-fields{display:grid;gap:7px;margin-top:7px}
      .customer-extra-fields.two{grid-template-columns:1fr 1fr}
      .customer-extra-hidden{display:none!important}
      @media(max-width:1150px){.customer-card-grid{grid-template-columns:1fr!important}.customer-extra-fields.two{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function makeInput(id,placeholder,type='text'){
    const input=document.createElement('input');input.id=id;input.placeholder=placeholder;input.type=type;return input;
  }

  function extendContacts(){
    const list=document.querySelector('.customer-contact-list');
    if(!list||list.dataset.extended==='1')return;
    const head=list.querySelector('.customer-contact-head');
    if(head){
      const existing=[...head.querySelectorAll('span')];
      if(existing.length>=3){
        const role=document.createElement('span');role.textContent='Görevi';
        head.insertBefore(role,existing[2]);
        const email=document.createElement('span');email.textContent='Mail Adresi';head.appendChild(email);
      }
    }
    list.querySelectorAll('.customer-contact-row').forEach((row,index)=>{
      const n=index+1,phone=$('c_person_'+n+'_phone');
      if(phone&&!$('c_person_'+n+'_role'))row.insertBefore(makeInput('c_person_'+n+'_role','Görevi'),phone);
      if(!$('c_person_'+n+'_email'))row.appendChild(makeInput('c_person_'+n+'_email','Mail adresi','email'));
    });
    list.dataset.extended='1';
  }

  function extendLocation(){
    const city=$('c_region');if(!city)return;
    const row=city.closest('.field-row');
    if(row){const label=row.querySelector('label');if(label)label.textContent='İl'}
    if(!$('c_district')&&row){
      const district=document.createElement('div');district.className='field-row';
      district.innerHTML='<label>İlçe</label><input id="c_district" placeholder="İlçe">';
      row.insertAdjacentElement('afterend',district);
    }
  }

  function replaceIndependentMail(){
    const emails=$('c_emails');if(!emails)return;
    const wrapper=emails.parentElement;if(wrapper)wrapper.style.display='none';
    const panel=emails.closest('.form-panel');if(!panel)return;
    const title=panel.querySelector('h4');if(title)title.textContent='Kategori / Sevkiyat / Servis';
    if($('customerCargoBlock'))return;
    const stack=panel.querySelector('.form-stack');if(!stack)return;

    const cargo=document.createElement('div');cargo.id='customerCargoBlock';cargo.className='customer-extra-block';
    cargo.innerHTML=`<label><input id="c_cargo_enabled" type="checkbox"> Anlaşmalı Kargo Var</label>
      <div id="c_cargo_fields" class="customer-extra-fields customer-extra-hidden">
        <div class="customer-extra-fields two"><input id="c_cargo_company" placeholder="Kargo firması"><input id="c_cargo_code" placeholder="Müşteri / anlaşma kodu"></div>
        <textarea id="c_cargo_note" rows="2" placeholder="Kargo notu / gönderim bilgisi"></textarea>
      </div>`;
    stack.appendChild(cargo);

    const service=document.createElement('div');service.id='customerServiceBlock';service.className='customer-extra-block';
    service.innerHTML=`<label><input id="c_service_requested" type="checkbox"> Servis Talebi Var</label>
      <div id="c_service_fields" class="customer-extra-fields customer-extra-hidden">
        <div class="customer-extra-fields two"><input id="c_service_type" placeholder="Servis türü"><input id="c_service_date" type="date" title="İstenen servis tarihi"></div>
        <textarea id="c_service_description" rows="3" placeholder="Servis talebi / açıklama"></textarea>
      </div>`;
    stack.appendChild(service);

    $('c_cargo_enabled').addEventListener('change',toggleExtraBlocks);
    $('c_service_requested').addEventListener('change',toggleExtraBlocks);
  }

  function extendSpecialRequests(){
    if($('c_customer_requests'))return;
    const panels=[...document.querySelectorAll('#customerModal .form-panel')];
    const target=panels.find(p=>(p.querySelector('h4')?.textContent||'').includes('Cari'))||panels[panels.length-1];
    const stack=target?.querySelector('.form-stack');if(!stack)return;
    const block=document.createElement('div');
    block.innerHTML='<label style="font-weight:800">Müşterinin Özel İstekleri / Görüşme Notu</label><textarea id="c_customer_requests" rows="4" placeholder="Müşterinin özellikle istediği ürün, termin, fiyat, kalite, numune, teknik detay vb."></textarea>';
    stack.insertBefore(block,stack.firstChild);
  }

  function toggleExtraBlocks(){
    $('c_cargo_fields')?.classList.toggle('customer-extra-hidden',!$('c_cargo_enabled')?.checked);
    $('c_service_fields')?.classList.toggle('customer-extra-hidden',!$('c_service_requested')?.checked);
  }

  function buildUi(){injectStyle();extendContacts();extendLocation();replaceIndependentMail();extendSpecialRequests();toggleExtraBlocks()}

  function contactsFromForm(){
    const rows=[];
    for(let i=1;i<=4;i++){
      const item={name:clean($('c_person_'+i+'_name')?.value),role:clean($('c_person_'+i+'_role')?.value),phone:clean($('c_person_'+i+'_phone')?.value),email:clean($('c_person_'+i+'_email')?.value)};
      if(item.name||item.role||item.phone||item.email)rows.push(item);
    }
    return rows;
  }

  function extendedPayload(){
    const contacts=contactsFromForm();
    return {
      contacts,
      contact_name:contacts.map(x=>x.name).filter(Boolean).join('\n'),
      phones:contacts.map(x=>x.phone).filter(Boolean),
      emails:contacts.map(x=>x.email).filter(Boolean),
      district:clean($('c_district')?.value),
      customer_requests:clean($('c_customer_requests')?.value),
      cargo_enabled:Boolean($('c_cargo_enabled')?.checked),
      cargo_company:clean($('c_cargo_company')?.value),
      cargo_code:clean($('c_cargo_code')?.value),
      cargo_note:clean($('c_cargo_note')?.value),
      service_requested:Boolean($('c_service_requested')?.checked),
      service_type:clean($('c_service_type')?.value),
      service_description:clean($('c_service_description')?.value),
      service_date:clean($('c_service_date')?.value)
    };
  }

  function legacyContacts(customer){
    const names=clean(customer?.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    const phones=Array.isArray(customer?.phones_json)?customer.phones_json:parse(customer?.phones_json||'[]',[]);
    const emails=Array.isArray(customer?.emails_json)?customer.emails_json:parse(customer?.emails_json||'[]',[]);
    return Array.from({length:Math.min(4,Math.max(names.length,phones.length,emails.length,1))},(_,i)=>({name:clean(names[i]),role:'',phone:clean(phones[i]),email:clean(emails[i])})).filter(x=>x.name||x.phone||x.email);
  }

  function customerContacts(customer){
    const contacts=Array.isArray(customer?.contacts_json)?customer.contacts_json:parse(customer?.contacts_json||'[]',[]);
    return Array.isArray(contacts)&&contacts.length?contacts.slice(0,4):legacyContacts(customer);
  }

  function resetExtended(){
    for(let i=1;i<=4;i++){
      if($('c_person_'+i+'_role'))$('c_person_'+i+'_role').value='';
      if($('c_person_'+i+'_email'))$('c_person_'+i+'_email').value='';
    }
    ['c_district','c_customer_requests','c_cargo_company','c_cargo_code','c_cargo_note','c_service_type','c_service_description','c_service_date'].forEach(id=>{if($(id))$(id).value=''});
    if($('c_cargo_enabled'))$('c_cargo_enabled').checked=false;
    if($('c_service_requested'))$('c_service_requested').checked=false;
    toggleExtraBlocks();
  }

  function fillCustomer(customer){
    resetExtended();
    customerContacts(customer).forEach((item,index)=>{
      const i=index+1;
      if($('c_person_'+i+'_name')&&item.name!==undefined)$('c_person_'+i+'_name').value=clean(item.name);
      if($('c_person_'+i+'_role'))$('c_person_'+i+'_role').value=clean(item.role);
      if($('c_person_'+i+'_phone')&&item.phone!==undefined)$('c_person_'+i+'_phone').value=clean(item.phone);
      if($('c_person_'+i+'_email'))$('c_person_'+i+'_email').value=clean(item.email);
    });
    if($('c_district'))$('c_district').value=clean(customer?.district);
    if($('c_customer_requests'))$('c_customer_requests').value=clean(customer?.customer_requests);
    if($('c_cargo_enabled'))$('c_cargo_enabled').checked=Boolean(Number(customer?.cargo_enabled||0));
    if($('c_cargo_company'))$('c_cargo_company').value=clean(customer?.cargo_company);
    if($('c_cargo_code'))$('c_cargo_code').value=clean(customer?.cargo_code);
    if($('c_cargo_note'))$('c_cargo_note').value=clean(customer?.cargo_note);
    if($('c_service_requested'))$('c_service_requested').checked=Boolean(Number(customer?.service_requested||0));
    if($('c_service_type'))$('c_service_type').value=clean(customer?.service_type);
    if($('c_service_description'))$('c_service_description').value=clean(customer?.service_description);
    if($('c_service_date'))$('c_service_date').value=clean(customer?.service_date);
    const legacyMail=$('c_emails');if(legacyMail)legacyMail.value=customerContacts(customer).map(x=>clean(x.email)).filter(Boolean).join('\n');
    toggleExtraBlocks();
  }

  async function loadAllCustomers(){
    if(loadingCustomers)return;loadingCustomers=true;
    try{
      const response=await originalFetch('/api/customers?status=T%C3%BCm%C3%BC',{credentials:'same-origin',cache:'no-store'});
      if(response.ok){const rows=await response.json();if(Array.isArray(rows))rows.forEach(row=>customerCache.set(String(row.id),row));}
    }catch(_){}finally{loadingCustomers=false}
  }

  async function monitorCustomerModal(){
    buildUi();
    const modal=$('customerModal');if(!modal||!modal.classList.contains('open')){currentCustomerKey='__closed__';return;}
    const key=clean($('c_id')?.value)||'__new__';
    if(key===currentCustomerKey)return;
    currentCustomerKey=key;
    if(key==='__new__'){resetExtended();return;}
    if(!customerCache.has(key))await loadAllCustomers();
    const customer=customerCache.get(key);if(customer)fillCustomer(customer);
  }

  window.fetch=async function(input,init){
    let url='';try{url=typeof input==='string'?input:input?.url||''}catch(_){}
    const method=String(init?.method||(typeof input!=='string'&&input?.method)||'GET').toUpperCase();
    const isCustomerWrite=/\/api\/customers(?:\/\d+)?(?:\?.*)?$/.test(url)&&['POST','PUT'].includes(method);
    if(isCustomerWrite&&init?.body&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body),extra=extendedPayload();
        Object.assign(body,extra);
        const legacyMail=$('c_emails');if(legacyMail)legacyMail.value=extra.emails.join('\n');
        init={...init,body:JSON.stringify(body)};
      }catch(_){}
    }
    const response=await originalFetch(input,init);
    if(/\/api\/customers(?:\?|$)/.test(url)&&method==='GET'&&response.ok){
      try{const rows=await response.clone().json();if(Array.isArray(rows))rows.forEach(row=>customerCache.set(String(row.id),row));}catch(_){}
    }
    if(isCustomerWrite&&response.ok){
      currentCustomerKey='__refresh__';setTimeout(loadAllCustomers,150);
    }
    return response;
  };

  function start(){buildUi();loadAllCustomers();setInterval(monitorCustomerModal,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
