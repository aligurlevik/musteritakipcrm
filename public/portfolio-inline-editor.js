(function(){
  'use strict';

  const clean=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseArray=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const currentCustomer=()=>{try{return typeof selected!=='undefined'?selected:null}catch(_){return null}};

  function currentContacts(c){
    const direct=parseArray(c?.contacts_json).map(x=>({name:clean(x?.name),role:clean(x?.role),phone:clean(x?.phone),email:clean(x?.email)}));
    if(direct.length)return direct.slice(0,4);
    const names=clean(c?.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    const phones=parseArray(c?.phones_json).map(clean);
    const emails=parseArray(c?.emails_json).map(clean);
    const n=Math.min(4,Math.max(names.length,phones.length,emails.length,c?.phone?1:0,c?.email?1:0));
    const out=[];
    for(let i=0;i<n;i++)out.push({name:names[i]||'',role:'',phone:phones[i]||(!i?clean(c?.phone):''),email:emails[i]||(!i?clean(c?.email):'')});
    return out;
  }

  function resultFromStage(stage){
    const s=clean(stage);
    if(s==='Kazanıldı')return 'Olumlu';
    if(s==='Kaybedildi')return 'Olumsuz';
    if(s==='Beklemede')return 'Beklemede';
    return 'Sonuçlanmamış';
  }

  function stageFromResult(result,currentStage){
    if(result==='Olumlu')return 'Kazanıldı';
    if(result==='Olumsuz')return 'Kaybedildi';
    if(result==='Beklemede')return 'Beklemede';
    if(['Kazanıldı','Kaybedildi','Beklemede'].includes(currentStage))return 'Yeni Lead';
    return currentStage||'Yeni Lead';
  }

  function ensureStyle(){
    if(document.getElementById('portfolioInlineEditorStyle'))return;
    const st=document.createElement('style');
    st.id='portfolioInlineEditorStyle';
    st.textContent=`
      .pie-editor{border:2px solid #1769f6;border-radius:12px;background:#f8fbff;margin:8px 0 10px;padding:10px}
      .pie-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
      .pie-title{font-size:14px;font-weight:900;color:#0f172a}.pie-sub{font-size:10px;color:#64748b;margin-top:2px}
      .pie-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pie-field{min-width:0}.pie-field.wide{grid-column:1/-1}
      .pie-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}
      .pie-field input,.pie-field select,.pie-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#0f172a;padding:8px 9px;font:inherit;font-size:12px;outline:none}
      .pie-field textarea{min-height:58px;resize:vertical;line-height:1.4}.pie-field input:focus,.pie-field select:focus,.pie-field textarea:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}
      .pie-contact-toggle{width:100%;min-height:42px;border:1px solid #cbd8e8;border-radius:9px;background:#fff;padding:8px 10px;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;color:#0f172a;font-weight:900}
      .pie-contact-toggle:hover{border-color:#1769f6;background:#f8fbff}.pie-contact-summary{font-weight:700;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}.pie-contact-chevron{color:#1769f6;font-size:11px;transition:transform .15s ease}.pie-contact-toggle[aria-expanded="true"] .pie-contact-chevron{transform:rotate(180deg)}
      .pie-contact-panel{margin-top:7px;border:1px solid #dbe5f0;border-radius:9px;background:#fff;padding:8px}.pie-contact-panel[hidden]{display:none!important}
      .pie-contact-head,.pie-contact-row{display:grid;grid-template-columns:28px 1.15fr .85fr .9fr 1.2fr;gap:6px;align-items:center;min-width:720px}.pie-contacts{overflow:auto}.pie-contact-head{font-size:9px;font-weight:900;color:#64748b;margin-bottom:4px}.pie-contact-row{margin-bottom:5px}.pie-contact-row:last-child{margin-bottom:0}.pie-contact-row input{width:100%;border:1px solid #cbd8e8;border-radius:7px;padding:7px;font-size:11px}.pie-no{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#e8f1ff;color:#1769f6;font-size:10px;font-weight:900}
      .pie-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:9px}.pie-save{border:0;border-radius:9px;background:#1769f6;color:#fff;padding:9px 14px;font-weight:900;cursor:pointer}.pie-save:disabled{opacity:.55;cursor:wait}.pie-status{font-size:11px;font-weight:800;margin-right:auto;color:#16a34a}.pie-status.err{color:#dc2626}
      .pie-readonly-note{font-size:10px;color:#64748b;background:#fff;border:1px dashed #cbd8e8;border-radius:8px;padding:7px 9px;margin-top:7px}
      @media(max-width:800px){.pie-grid{grid-template-columns:1fr}.pie-field.wide{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function option(value,label,current){return `<option value="${esc(value)}"${String(current)===String(value)?' selected':''}>${esc(label)}</option>`}

  function editorHtml(c){
    const originalContacts=currentContacts(c);
    const contactCount=originalContacts.filter(x=>x.name||x.role||x.phone||x.email).length;
    const contactSummary=originalContacts.filter(x=>x.name||x.phone||x.email).map(x=>x.name||x.phone||x.email).slice(0,3).join(' • ')||'Yetkili bilgisi ekle';
    const contacts=originalContacts.slice();while(contacts.length<4)contacts.push({name:'',role:'',phone:'',email:''});
    const categories=clean(c.categories||c.sector);
    const priority=clean(c.priority||'NORMAL');
    const stage=clean(c.stage||'Yeni Lead');
    const result=resultFromStage(stage);
    const contactRows=contacts.map((x,i)=>`<div class="pie-contact-row"><span class="pie-no">${i+1}</span><input data-pie="name${i}" value="${esc(x.name)}" placeholder="İsim Soyisim"><input data-pie="role${i}" value="${esc(x.role)}" placeholder="Görevi"><input data-pie="phone${i}" value="${esc(x.phone)}" placeholder="Telefon"><input data-pie="email${i}" value="${esc(x.email)}" placeholder="E-posta"></div>`).join('');
    return `<section class="pie-editor" data-customer-id="${Number(c.id||0)}">
      <div class="pie-head"><div><div class="pie-title">✏️ Müşteri Bilgilerini Düzenle</div><div class="pie-sub">Kutuların içini değiştirip alttaki “Değişiklikleri Kaydet” butonuna basın.</div></div></div>
      <div class="pie-grid">
        <div class="pie-field"><label>Firma Adı</label><input data-pie="company" value="${esc(c.company)}"></div>
        <div class="pie-field"><label>İl / Bölge</label><input data-pie="region" value="${esc(c.region)}"></div>
        <div class="pie-field wide">
          <button type="button" class="pie-contact-toggle" aria-expanded="false"><span>👥 Yetkililer (${contactCount})</span><span class="pie-contact-summary">${esc(contactSummary)}</span><span class="pie-contact-chevron">▼</span></button>
          <div class="pie-contact-panel" hidden><div class="pie-contacts"><div class="pie-contact-head"><span></span><span>İsim Soyisim</span><span>Görevi</span><span>Telefon</span><span>E-posta</span></div>${contactRows}</div></div>
        </div>
        <div class="pie-field"><label>Potansiyel</label><select data-pie="priority">${option('KRİTİK','Yüksek',priority)}${option('YÜKSEK','Orta',priority)}${option('NORMAL','Düşük',priority)}${option('DÜŞÜK','Çok Düşük',priority)}</select></div>
        <div class="pie-field"><label>Sonuç</label><select data-pie="result">${option('Sonuçlanmamış','Sonuçlanmamış',result)}${option('Beklemede','Beklemede',result)}${option('Olumlu','Olumlu',result)}${option('Olumsuz','Olumsuz',result)}</select></div>
        <div class="pie-field"><label>Aşama</label><select data-pie="stage">${['Yeni Lead','İlk Görüşme','Teklif','Pazarlık','Beklemede','Kazanıldı','Kaybedildi'].map(v=>option(v,v,stage)).join('')}</select></div>
        <div class="pie-field"><label>İş Alanı</label><input data-pie="categories" value="${esc(categories)}" placeholder="Ambalaj, Matbaa ..."></div>
        <div class="pie-field"><label>Sonraki İşlem</label><input data-pie="follow_date" type="date" value="${esc(clean(c.follow_date).slice(0,10))}"></div>
        <div class="pie-field wide"><label>Makine / Teknik Bilgi</label><textarea data-pie="machine_info">${esc(c.machine_info)}</textarea></div>
        <div class="pie-field wide"><label>Müşteri Talepleri</label><textarea data-pie="customer_requests">${esc(c.customer_requests)}</textarea></div>
        <div class="pie-field wide"><label>Özel Notlar</label><textarea data-pie="special_notes">${esc(c.special_notes)}</textarea></div>
      </div>
      <div class="pie-readonly-note">Son Görüşme, Görüşme Sayısı ve Teklif Sayısı kayıt geçmişinden otomatik hesaplanır; bunlar elle değiştirilmez.</div>
      <div class="pie-actions"><span class="pie-status"></span><button type="button" class="pie-save">✓ Değişiklikleri Kaydet</button></div>
    </section>`;
  }

  function getField(root,name){return root.querySelector(`[data-pie="${name}"]`)}

  async function saveEditor(root,c){
    const btn=root.querySelector('.pie-save'),status=root.querySelector('.pie-status');
    const company=clean(getField(root,'company')?.value);
    if(!company){status.textContent='Firma adı boş olamaz.';status.className='pie-status err';return}
    const contacts=[];
    for(let i=0;i<4;i++){
      const row={name:clean(getField(root,'name'+i)?.value),role:clean(getField(root,'role'+i)?.value),phone:clean(getField(root,'phone'+i)?.value),email:clean(getField(root,'email'+i)?.value)};
      if(row.name||row.role||row.phone||row.email)contacts.push(row);
    }
    const phones=contacts.map(x=>x.phone).filter(Boolean),emails=contacts.map(x=>x.email).filter(Boolean);
    const stage=clean(getField(root,'stage')?.value);
    const categories=clean(getField(root,'categories')?.value).split(',').map(clean).filter(Boolean);
    const payload={
      company,
      contact_name:contacts.map(x=>x.name).filter(Boolean).join('\n'),
      contacts,
      phones,
      emails,
      region:clean(getField(root,'region')?.value),
      district:clean(c.district),
      priority:clean(getField(root,'priority')?.value)||'NORMAL',
      stage:stage||'Yeni Lead',
      follow_date:getField(root,'follow_date')?.value||'',
      categories,
      customer_requests:clean(getField(root,'customer_requests')?.value),
      special_notes:clean(getField(root,'special_notes')?.value),
      machine_info:clean(getField(root,'machine_info')?.value),
      invoice_title:clean(c.invoice_title),tax_office:clean(c.tax_office),tax_number:clean(c.tax_number),invoice_address:clean(c.invoice_address),
      cargo_enabled:Boolean(c.cargo_enabled),cargo_company:clean(c.cargo_company),cargo_code:clean(c.cargo_code),cargo_note:clean(c.cargo_note),
      service_requested:Boolean(c.service_requested),service_type:clean(c.service_type),service_description:clean(c.service_description),service_date:clean(c.service_date)
    };
    btn.disabled=true;btn.textContent='Kaydediliyor...';status.textContent='';status.className='pie-status';
    try{
      const r=await fetch('/api/customers/'+Number(c.id),{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
      let data={};try{data=await r.json()}catch(_){}
      if(r.status===401){location.href='/';return}
      if(!r.ok)throw new Error(data.error||'Değişiklikler kaydedilemedi.');

      if(payload.stage==='Kaybedildi'){
        const rr=await fetch('/api/customers/'+Number(c.id)+'/result',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({result:'Olumsuz'})});if(!rr.ok)throw new Error('Sonuç kaydedilemedi.');
      }else if(payload.stage==='Kazanıldı'){
        const rr=await fetch('/api/customers/'+Number(c.id)+'/result',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({result:'Olumlu'})});if(!rr.ok)throw new Error('Sonuç kaydedilemedi.');
      }else{
        await fetch('/api/customers/'+Number(c.id)+'/restore',{method:'POST',credentials:'same-origin'});
      }

      Object.assign(c,payload,{categories:categories.join(','),sector:categories.join(','),contacts_json:JSON.stringify(contacts),phones_json:JSON.stringify(phones),emails_json:JSON.stringify(emails),phone:phones[0]||'',email:emails[0]||''});
      status.textContent='✓ Değişiklikler kaydedildi.';status.className='pie-status';
      btn.textContent='✓ Değişiklikleri Kaydet';btn.disabled=false;
      setTimeout(()=>{try{if(typeof loadCustomers==='function')loadCustomers()}catch(_){ }},100);
    }catch(e){
      status.textContent=e?.message||'Değişiklikler kaydedilemedi.';status.className='pie-status err';btn.disabled=false;btn.textContent='✓ Değişiklikleri Kaydet';
    }
  }

  function wire(root,c){
    const result=getField(root,'result'),stage=getField(root,'stage');
    result?.addEventListener('change',()=>{stage.value=stageFromResult(result.value,stage.value)});
    stage?.addEventListener('change',()=>{result.value=resultFromStage(stage.value)});
    root.querySelector('.pie-contact-toggle')?.addEventListener('click',e=>{
      const button=e.currentTarget;
      const panel=root.querySelector('.pie-contact-panel');
      const open=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',open?'false':'true');
      if(panel)panel.hidden=open;
    });
    root.querySelector('.pie-save')?.addEventListener('click',()=>saveEditor(root,c));
  }

  function mount(){
    ensureStyle();
    const modal=document.getElementById('portfolioDetailExpandModal');
    const c=currentCustomer();
    if(!modal||!modal.classList.contains('show')||!c?.id)return;
    const body=modal.querySelector('.pdem-body');if(!body)return;
    const existing=body.querySelector('.pie-editor');
    if(existing&&Number(existing.dataset.customerId)===Number(c.id))return;
    existing?.remove();
    body.insertAdjacentHTML('afterbegin',editorHtml(c));
    wire(body.querySelector('.pie-editor'),c);
  }

  const observer=new MutationObserver(()=>setTimeout(mount,0));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(mount,40),true);
  setInterval(mount,1200);
})();