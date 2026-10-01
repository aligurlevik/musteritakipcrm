(function(){
  'use strict';

  const TAB_DEFS=[
    {index:0,label:'Genel'},
    {index:1,label:'Satış & Görüşmeler'},
    {index:3,label:'Yapılacaklar'},
    {index:4,label:'Teknik & Notlar'}
  ];

  function currentCustomer(){
    try{return typeof selected!=='undefined'?selected:null}catch(_){return null}
  }

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function isTrue(v){
    return v===true||v===1||v==='1'||String(v||'').toLowerCase()==='true';
  }

  function ensureStyle(){
    if(document.getElementById('portfolioSectionTabsStyle'))return;
    const style=document.createElement('style');
    style.id='portfolioSectionTabsStyle';
    style.textContent=`
      #portfolioDetailExpandModal .pdem-head{grid-template-columns:minmax(260px,1fr) 38px!important}
      #portfolioDetailExpandModal .pdem-head>.pdem-close{grid-column:2!important}
      .pie-editor.pie-tabs-mode{background:#fff;border:1px solid #dce5ef;border-radius:12px;padding:0;overflow:hidden}
      .pie-editor.pie-tabs-mode .pie-head{padding:12px 14px 8px;margin:0;background:#fff}
      .pie-top-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #e5edf6;border-bottom:1px solid #dce5ef;background:#fff;position:sticky;top:0;z-index:3}
      body #portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:1fr 1.55fr 1fr 1.15fr .78fr .82fr!important}
      .pie-top-tab{border:0;background:#fff;padding:11px 7px 9px;font-size:11px;font-weight:900;color:#475569;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pie-top-tab:hover{background:#f8fbff;color:#1769f6}
      .pie-top-tab.active{color:#1769f6;border-bottom-color:#1769f6;background:#fff}
      .pie-editor.pie-tabs-mode .pie-section{display:none;border:0;border-radius:0;margin:0;background:#fff;overflow:visible}
      .pie-editor.pie-tabs-mode .pie-section.active-tab-panel{display:block}
      .pie-editor.pie-tabs-mode .pie-section>summary{display:none!important}
      .pie-editor.pie-tabs-mode .pie-section-body{padding:12px 14px}
      .pie-editor.pie-tabs-mode .pie-sales-panel .pie-section-body:before,.pie-editor.pie-tabs-mode .pie-meetings-panel .pie-section-body:before{display:block;font-size:12px;font-weight:950;color:#991b1b;margin:0 0 10px;padding-bottom:7px;border-bottom:1px solid #e5edf6}
      .pie-editor.pie-tabs-mode .pie-sales-panel .pie-section-body:before{content:'Satış & Potansiyel'}
      .pie-editor.pie-tabs-mode .pie-meetings-panel .pie-section-body:before{content:'Görüşmeler & Notlar'}
      .pie-editor.pie-tabs-mode .pie-readonly-note{margin:0 14px 8px}
      .pie-editor.pie-tabs-mode .pie-actions{padding:0 14px 12px;margin-top:8px}
      .pie-general-contact{margin:0 0 10px!important;padding:0!important;background:transparent!important;border:0!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important}
      .pie-general-contact .pdem-contact-item{background:#f8fafc!important}
      .pie-tab-quick-note{margin:0 0 12px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fbff!important}
      .pie-hidden-contact-editor{display:block!important}
      .pie-cari-card,.pie-extra-card{margin-top:12px;border:1px solid #dbe5f0;border-radius:10px;background:#f8fafc;padding:11px}
      .pie-cari-head,.pie-extra-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:900;color:#0f172a;margin-bottom:9px}
      .pie-cari-badge{display:inline-flex;align-items:center;border-radius:999px;background:#dcfce7;color:#15803d;padding:4px 9px;font-size:10px;font-weight:900}
      .pie-cari-grid,.pie-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .pie-cari-field,.pie-extra-field{min-width:0}.pie-cari-field.wide,.pie-extra-field.wide{grid-column:1/-1}
      .pie-cari-field label,.pie-extra-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}
      .pie-cari-field input,.pie-cari-field textarea,.pie-extra-field input,.pie-extra-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#0f172a;padding:8px 9px;font:inherit;font-size:12px;outline:none}
      .pie-cari-field textarea,.pie-extra-field textarea{min-height:62px;resize:vertical;line-height:1.4}
      .pie-cari-field input:focus,.pie-cari-field textarea:focus,.pie-extra-field input:focus,.pie-extra-field textarea:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}
      .pie-cari-note,.pie-extra-note{margin-top:7px;font-size:10px;color:#64748b}
      .pie-checkline{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:900;color:#334155;margin-bottom:7px}.pie-checkline input{width:auto!important}
      .pie-subbox{border:1px solid #e2e8f0;border-radius:9px;background:#fff;padding:9px}.pie-subbox-title{font-size:11px;font-weight:900;color:#0f172a;margin-bottom:7px}
      @media(max-width:1050px){body #portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:repeat(6,minmax(125px,1fr))!important;overflow-x:auto!important}}
      @media(max-width:900px){.pie-top-tab{font-size:10px}.pie-general-contact{grid-template-columns:1fr!important}.pie-cari-grid,.pie-extra-grid{grid-template-columns:1fr}.pie-cari-field.wide,.pie-extra-field.wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function activate(editor,sections,index){
    sections.forEach((section,i)=>{
      const active=index===1?(i===1||i===2):i===index;
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');
      else section.removeAttribute('open');
    });
    editor.querySelectorAll('.pie-top-tab').forEach(button=>{
      const active=Number(button.dataset.tabIndex)===index;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function moveHeaderContent(modal,sections){
    const generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    const meetingsBody=sections[2]&&sections[2].querySelector('.pie-section-body');

    const contact=modal.querySelector('.pdem-contact');
    if(contact&&generalBody&&contact.parentNode!==generalBody){
      contact.classList.add('pie-general-contact');
      generalBody.insertBefore(contact,generalBody.firstChild);
    }

    const quickNote=modal.querySelector('.pdem-quick-note');
    if(quickNote&&meetingsBody&&quickNote.parentNode!==meetingsBody){
      quickNote.classList.add('pie-tab-quick-note');
      meetingsBody.insertBefore(quickNote,meetingsBody.firstChild);
    }
  }

  function mountCariCard(sections){
    const c=currentCustomer();
    const generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    if(!c||!generalBody)return;

    let card=generalBody.querySelector('.pie-cari-card');
    if(!card){
      card=document.createElement('section');
      card.className='pie-cari-card';
      generalBody.appendChild(card);
    }

    const identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(card.dataset.customerIdentity===identity)return;
    card.dataset.customerIdentity=identity;

    card.innerHTML=`
      <div class="pie-cari-head">
        <span>💼 Cari Kart Bilgileri</span>
        <span class="pie-cari-badge">${esc(c.record_status||'Aktif')}</span>
      </div>
      <div class="pie-cari-grid">
        <div class="pie-cari-field"><label>Cari / Fatura Ünvanı</label><input data-cari-field="invoice_title" value="${esc(c.invoice_title||c.company||'')}" placeholder="Cari veya fatura ünvanı"></div>
        <div class="pie-cari-field"><label>Vergi Dairesi</label><input data-cari-field="tax_office" value="${esc(c.tax_office||'')}" placeholder="Vergi dairesi"></div>
        <div class="pie-cari-field"><label>Vergi No / TCKN</label><input data-cari-field="tax_number" value="${esc(c.tax_number||'')}" placeholder="Vergi numarası"></div>
        <div class="pie-cari-field"><label>İlçe</label><input data-cari-field="district" value="${esc(c.district||'')}" placeholder="İlçe"></div>
        <div class="pie-cari-field wide"><label>Cari / Fatura Adresi</label><textarea data-cari-field="invoice_address" placeholder="Cari veya fatura adresi">${esc(c.invoice_address||'')}</textarea></div>
      </div>
      <div class="pie-cari-note">Yeni müşteri kaydında girilen cari bilgiler burada otomatik görünür ve düzenlenebilir.</div>
    `;

    card.querySelectorAll('[data-cari-field]').forEach(input=>{
      const sync=()=>{
        const field=input.dataset.cariField;
        if(field)c[field]=input.value;
      };
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
    });
  }

  function mountInitialExtraFields(sections){
    const c=currentCustomer();
    const technicalBody=sections[4]&&sections[4].querySelector('.pie-section-body');
    if(!c||!technicalBody)return;

    let card=technicalBody.querySelector('.pie-extra-card');
    if(!card){
      card=document.createElement('section');
      card.className='pie-extra-card';
      technicalBody.appendChild(card);
    }

    const identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(card.dataset.customerIdentity===identity)return;
    card.dataset.customerIdentity=identity;

    card.innerHTML=`
      <div class="pie-extra-head"><span>📦 İlk Kayıttan Gelen Sevkiyat / Servis Bilgileri</span></div>
      <div class="pie-extra-grid">
        <div class="pie-subbox">
          <div class="pie-subbox-title">Kargo Bilgileri</div>
          <label class="pie-checkline"><input type="checkbox" data-extra-check="cargo_enabled" ${isTrue(c.cargo_enabled)?'checked':''}> Anlaşmalı kargo var</label>
          <div class="pie-extra-field"><label>Kargo Firması</label><input data-extra-field="cargo_company" value="${esc(c.cargo_company||'')}" placeholder="Kargo firması"></div>
          <div class="pie-extra-field" style="margin-top:7px"><label>Müşteri / Anlaşma Kodu</label><input data-extra-field="cargo_code" value="${esc(c.cargo_code||'')}" placeholder="Anlaşma kodu"></div>
          <div class="pie-extra-field" style="margin-top:7px"><label>Kargo Notu</label><textarea data-extra-field="cargo_note" placeholder="Kargo notu">${esc(c.cargo_note||'')}</textarea></div>
        </div>
        <div class="pie-subbox">
          <div class="pie-subbox-title">Servis Bilgileri</div>
          <label class="pie-checkline"><input type="checkbox" data-extra-check="service_requested" ${isTrue(c.service_requested)?'checked':''}> Servis talebi var</label>
          <div class="pie-extra-field"><label>Servis Türü</label><input data-extra-field="service_type" value="${esc(c.service_type||'')}" placeholder="Servis türü"></div>
          <div class="pie-extra-field" style="margin-top:7px"><label>İstenen Tarih</label><input type="date" data-extra-field="service_date" value="${esc(String(c.service_date||'').slice(0,10))}"></div>
          <div class="pie-extra-field" style="margin-top:7px"><label>Servis Açıklaması</label><textarea data-extra-field="service_description" placeholder="Servis açıklaması">${esc(c.service_description||'')}</textarea></div>
        </div>
      </div>
      <div class="pie-extra-note">Yeni müşteri açarken girilen kargo ve servis bilgileri burada otomatik gelir.</div>
    `;

    card.querySelectorAll('[data-extra-field]').forEach(input=>{
      const sync=()=>{const field=input.dataset.extraField;if(field)c[field]=input.value;};
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
    });
    card.querySelectorAll('[data-extra-check]').forEach(input=>{
      const sync=()=>{const field=input.dataset.extraCheck;if(field)c[field]=input.checked;};
      input.addEventListener('change',sync);
    });
  }

  function updateCustomerTitle(modal){
    const c=currentCustomer();
    const company=String(c&&c.company||'').trim();
    const title=modal.querySelector('.pdem-title');
    if(title)title.textContent=company?'Müşteri Kartı — '+company:'Müşteri Kartı';
    const sub=modal.querySelector('.pdem-sub');
    if(sub)sub.textContent='Firma bilgileri, satış, görüşmeler ve yapılacak işlemler.';
  }

  function applyLayout(){
    const modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    const body=modal.querySelector('.pdem-body');
    const editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor)return;

    ensureStyle();
    const sections=Array.from(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;
    if(editor.dataset.sectionLayoutReady==='tabs-v7-sales-meetings')return;
    editor.dataset.sectionLayoutReady='tabs-v7-sales-meetings';

    updateCustomerTitle(modal);
    moveHeaderContent(modal,sections);
    mountCariCard(sections);
    mountInitialExtraFields(sections);
    sections[1].classList.add('pie-sales-panel');
    sections[2].classList.add('pie-meetings-panel');
    editor.classList.add('pie-tabs-mode');

    const title=editor.querySelector('.pie-title');
    if(title)title.textContent='Müşteri Bilgileri';
    const sub=editor.querySelector('.pie-sub');
    if(sub)sub.textContent='Satış bilgileri ve görüşme notları aynı sekmede birlikte gösterilir.';

    let tabs=editor.querySelector('.pie-top-tabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.className='pie-top-tabs';
      tabs.setAttribute('role','tablist');
      const firstSection=sections[0];
      firstSection.parentNode.insertBefore(tabs,firstSection);
    }
    tabs.innerHTML=TAB_DEFS.map(tab=>`<button type="button" class="pie-top-tab${tab.index===0?' active':''}" role="tab" aria-selected="${tab.index===0?'true':'false'}" data-tab-index="${tab.index}">${tab.label}</button>`).join('');
    if(tabs.dataset.mergedWired!=='1'){
      tabs.dataset.mergedWired='1';
      tabs.addEventListener('click',event=>{
        const button=event.target.closest('.pie-top-tab');
        if(!button)return;
        const index=Number(button.dataset.tabIndex||0);
        activate(editor,sections,index);
      });
    }

    activate(editor,sections,0);

    requestAnimationFrame(()=>{
      body.scrollTop=0;
      const box=modal.querySelector('.pdem-box');
      if(box)box.scrollTop=0;
      modal.scrollTop=0;
      editor.scrollIntoView({block:'start',behavior:'auto'});
    });
  }

  const observer=new MutationObserver(()=>setTimeout(applyLayout,0));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',()=>setTimeout(applyLayout,80),true);
})();