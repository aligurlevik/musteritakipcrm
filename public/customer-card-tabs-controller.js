(function(){
  'use strict';
  if(window.__crmCustomerCardTabsController)return;
  window.__crmCustomerCardTabsController='20261002-root-v2';

  var TAB_DEFS=[
    {index:0,label:'Genel'},
    {index:1,label:'Satış & Görüşmeler'},
    {index:3,label:'Yapılacaklar'},
    {index:4,label:'Teknik & Notlar'},
    {index:7,label:'Müşteri Analizi'},
    {index:5,label:'Teklifler'},
    {index:6,label:'Mail'}
  ];

  function clean(v){return String(v==null?'':v).trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function isTrue(v){return v===true||v===1||v==='1'||String(v||'').toLowerCase()==='true'}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function setText(node,text){if(node&&node.textContent!==text)node.textContent=text}

  function ensureStyle(){
    if(document.getElementById('crmCustomerCardTabsControllerStyle'))return;
    var style=document.createElement('style');
    style.id='crmCustomerCardTabsControllerStyle';
    style.textContent='\n#portfolioDetailExpandModal .pdem-head{grid-template-columns:minmax(260px,1fr) 38px!important}\n#portfolioDetailExpandModal .pdem-head>.pdem-close{grid-column:2!important}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs{background:#fff;border:1px solid #dce5ef;border-radius:12px;padding:0;overflow:hidden}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-head{padding:12px 14px 8px;margin:0;background:#fff}\n#portfolioDetailExpandModal .crm-root-tabbar{display:grid;grid-template-columns:1fr 1.28fr 1fr 1.15fr 1.15fr .82fr .82fr;border-top:1px solid #e5edf6;border-bottom:1px solid #dce5ef;background:#fff;position:sticky;top:0;z-index:8}\n#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab{border:0;background:#fff;padding:14px 5px 12px;font-size:14px;font-weight:900;color:#dc2626;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab:hover{color:#991b1b;background:#fff7f7}\n#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab.active{color:#991b1b;border-bottom-color:#dc2626;background:#fff1f2}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-section{display:none!important;border:0;border-radius:0;margin:0;background:#fff;overflow:visible}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-section.crm-root-visible{display:block!important}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-section>summary{display:none!important}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-section-body{padding:12px 14px}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs.crm-analysis-mode .pie-section.crm-root-visible .pie-section-body>*{display:none!important}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs.crm-analysis-mode .pie-section.crm-root-visible .pie-section-body>.crm-care-satisfaction-card{display:block!important;margin-top:0!important}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-readonly-note{margin:0 14px 8px}\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs .pie-actions{padding:0 14px 12px;margin-top:8px}\n#portfolioDetailExpandModal .crm-root-extra-host{display:none;padding:12px 14px;background:#fff}\n#portfolioDetailExpandModal .crm-root-extra-host.active{display:block}\n#portfolioDetailExpandModal .crm-root-extra-host [data-crm-root-extra]{display:none!important}\n#portfolioDetailExpandModal .crm-root-extra-host [data-crm-root-extra].active{display:block!important}\n#portfolioDetailExpandModal .crm-root-empty{margin:12px 14px;padding:18px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px}\n#portfolioDetailExpandModal [data-hidden-duplicate-customer-panel="1"]{display:none!important}\n#portfolioDetailExpandModal .pie-general-contact{margin:0 0 10px!important;padding:0!important;background:transparent!important;border:0!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important}\n#portfolioDetailExpandModal .pie-general-contact .pdem-contact-item{background:#f8fafc!important}\n#portfolioDetailExpandModal .pie-tab-quick-note{margin:0 0 12px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fbff!important}\n#portfolioDetailExpandModal .pie-hidden-contact-editor{display:block!important}\n#portfolioDetailExpandModal .pie-cari-card,#portfolioDetailExpandModal .pie-extra-card{margin-top:12px;border:1px solid #dbe5f0;border-radius:10px;background:#f8fafc;padding:11px}\n#portfolioDetailExpandModal .pie-cari-head,#portfolioDetailExpandModal .pie-extra-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:900;color:#0f172a;margin-bottom:9px}\n#portfolioDetailExpandModal .pie-cari-badge{display:inline-flex;align-items:center;border-radius:999px;background:#dcfce7;color:#15803d;padding:4px 9px;font-size:10px;font-weight:900}\n#portfolioDetailExpandModal .pie-cari-grid,#portfolioDetailExpandModal .pie-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n#portfolioDetailExpandModal .pie-cari-field,#portfolioDetailExpandModal .pie-extra-field{min-width:0}\n#portfolioDetailExpandModal .pie-cari-field.wide,#portfolioDetailExpandModal .pie-extra-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .pie-cari-field label,#portfolioDetailExpandModal .pie-extra-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}\n#portfolioDetailExpandModal .pie-cari-field input,#portfolioDetailExpandModal .pie-cari-field textarea,#portfolioDetailExpandModal .pie-extra-field input,#portfolioDetailExpandModal .pie-extra-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#0f172a;padding:8px 9px;font:inherit;font-size:12px;outline:none}\n#portfolioDetailExpandModal .pie-cari-field textarea,#portfolioDetailExpandModal .pie-extra-field textarea{min-height:62px;resize:vertical;line-height:1.4}\n#portfolioDetailExpandModal .pie-cari-note,#portfolioDetailExpandModal .pie-extra-note{margin-top:7px;font-size:10px;color:#64748b}\n#portfolioDetailExpandModal .pie-checkline{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:900;color:#334155;margin-bottom:7px}\n#portfolioDetailExpandModal .pie-checkline input{width:auto!important}\n#portfolioDetailExpandModal .pie-subbox{border:1px solid #e2e8f0;border-radius:9px;background:#fff;padding:9px}\n#portfolioDetailExpandModal .pie-subbox-title{font-size:11px;font-weight:900;color:#0f172a;margin-bottom:7px}\n@media(max-width:1050px){#portfolioDetailExpandModal .crm-root-tabbar{grid-template-columns:repeat(7,minmax(125px,1fr));overflow-x:auto}#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab{font-size:13px}}\n@media(max-width:900px){#portfolioDetailExpandModal .pie-general-contact{grid-template-columns:1fr!important}#portfolioDetailExpandModal .pie-cari-grid,#portfolioDetailExpandModal .pie-extra-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .pie-cari-field.wide,#portfolioDetailExpandModal .pie-extra-field.wide{grid-column:auto}}';
    document.head.appendChild(style);
  }

  function syncAnalysisLabels(editor){
    var card=editor.querySelector('.crm-care-satisfaction-card');
    if(!card)return;
    setText(card.querySelector('.crm-care-card-title'),'📊 Müşteri Analizi');
    var satisfaction=card.querySelector('[data-satisfaction]');
    var satisfactionField=satisfaction?satisfaction.closest('.crm-care-field'):null;
    setText(satisfactionField?satisfactionField.querySelector('label'):null,'Memnuniyet Durumu');
    var loss=card.querySelector('[data-loss-reason]');
    var lossField=loss?loss.closest('.crm-care-field'):null;
    setText(lossField?lossField.querySelector('label'):null,'Kaybedilme Sebebi');
    setText(card.querySelector('[data-sat-save]'),'Müşteri Analizini Kaydet');
    var status=card.querySelector('[data-sat-status]');
    if(status&&status.textContent==='Memnuniyet bilgisi kaydedildi.')status.textContent='Müşteri analizi kaydedildi.';
  }

  function setButtonState(editor,index){
    editor.querySelectorAll('.crm-root-tabbar .pie-top-tab').forEach(function(button){
      var active=Number(button.getAttribute('data-tab-index'))===index;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function showSections(sections,index){
    sections.forEach(function(section,i){
      var active=index===7?(i===0):(index===1?(i===1||i===2):(i===index));
      section.classList.toggle('crm-root-visible',active);
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');else section.removeAttribute('open');
    });
  }

  function setChrome(editor,show){
    var note=editor.querySelector('.pie-readonly-note');
    var actions=editor.querySelector('.pie-actions');
    if(note)note.style.display=show?'':'none';
    if(actions)actions.style.display=show?'':'none';
  }

  function getExtraHost(editor){return editor.querySelector('.crm-root-extra-host')}
  function setOfferVisible(editor,show){
    var host=getExtraHost(editor);if(!host)return;
    host.classList.toggle('active',!!show);
    var pane=host.querySelector('[data-crm-root-extra="offers"]');
    if(pane)pane.classList.toggle('active',!!show);
  }

  function ensureMailPane(editor){
    var pane=editor.querySelector('.crm-mail-v2-pane');
    if(!pane){
      pane=document.createElement('div');
      pane.className='crm-mail-v2-pane';
      pane.innerHTML='<div class="crm-root-empty">Mail alanı hazırlanıyor...</div>';
      editor.appendChild(pane);
    }
    return pane;
  }

  function activate(editor,sections,index){
    if(![0,1,3,4,5,6,7].includes(index))index=0;
    editor.dataset.crmRootActiveTab=String(index);
    editor.classList.toggle('crm-analysis-mode',index===7);
    syncAnalysisLabels(editor);
    setButtonState(editor,index);
    showSections(sections,index);
    setOfferVisible(editor,index===5);
    setChrome(editor,index===0||index===1||index===3||index===4);
    if(index===6)ensureMailPane(editor);
    var legacy=editor.querySelector('.pie-legacy-extra-host');
    if(legacy)legacy.style.display='none';
  }

  function moveHeaderContent(modal,sections){
    var generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    var meetingsBody=sections[2]&&sections[2].querySelector('.pie-section-body');
    var contact=modal.querySelector('.pdem-contact');
    if(contact&&generalBody&&contact.parentNode!==generalBody){contact.classList.add('pie-general-contact');generalBody.insertBefore(contact,generalBody.firstChild)}
    var quickNote=modal.querySelector('.pdem-quick-note');
    if(quickNote&&meetingsBody&&quickNote.parentNode!==meetingsBody){quickNote.classList.add('pie-tab-quick-note');meetingsBody.insertBefore(quickNote,meetingsBody.firstChild)}
  }

  function mountCariCard(sections){
    var c=currentCustomer(),generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    if(!c||!generalBody)return;
    var card=generalBody.querySelector('.pie-cari-card');
    if(!card){card=document.createElement('section');card.className='pie-cari-card';generalBody.appendChild(card)}
    var identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(card.dataset.customerIdentity===identity)return;
    card.dataset.customerIdentity=identity;
    card.innerHTML='<div class="pie-cari-head"><span>💼 Cari Kart Bilgileri</span><span class="pie-cari-badge">'+esc(c.record_status||'Aktif')+'</span></div><div class="pie-cari-grid"><div class="pie-cari-field"><label>Cari / Fatura Ünvanı</label><input data-cari-field="invoice_title" value="'+esc(c.invoice_title||c.company||'')+'" placeholder="Cari veya fatura ünvanı"></div><div class="pie-cari-field"><label>Vergi Dairesi</label><input data-cari-field="tax_office" value="'+esc(c.tax_office||'')+'" placeholder="Vergi dairesi"></div><div class="pie-cari-field"><label>Vergi No / TCKN</label><input data-cari-field="tax_number" value="'+esc(c.tax_number||'')+'" placeholder="Vergi numarası"></div><div class="pie-cari-field"><label>İlçe</label><input data-cari-field="district" value="'+esc(c.district||'')+'" placeholder="İlçe"></div><div class="pie-cari-field wide"><label>Cari / Fatura Adresi</label><textarea data-cari-field="invoice_address" placeholder="Cari veya fatura adresi">'+esc(c.invoice_address||'')+'</textarea></div></div><div class="pie-cari-note">Yeni müşteri kaydında girilen cari bilgiler burada otomatik görünür ve düzenlenebilir.</div>';
    card.querySelectorAll('[data-cari-field]').forEach(function(input){var sync=function(){var field=input.dataset.cariField;if(field)c[field]=input.value};input.addEventListener('input',sync);input.addEventListener('change',sync)});
  }

  function mountInitialExtraFields(sections){
    var c=currentCustomer(),technicalBody=sections[4]&&sections[4].querySelector('.pie-section-body');
    if(!c||!technicalBody)return;
    var card=technicalBody.querySelector('.pie-extra-card');
    if(!card){card=document.createElement('section');card.className='pie-extra-card';technicalBody.appendChild(card)}
    var identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(card.dataset.customerIdentity===identity)return;
    card.dataset.customerIdentity=identity;
    card.innerHTML='<div class="pie-extra-head"><span>📦 İlk Kayıttan Gelen Sevkiyat / Servis Bilgileri</span></div><div class="pie-extra-grid"><div class="pie-subbox"><div class="pie-subbox-title">Kargo Bilgileri</div><label class="pie-checkline"><input type="checkbox" data-extra-check="cargo_enabled" '+(isTrue(c.cargo_enabled)?'checked':'')+'> Anlaşmalı kargo var</label><div class="pie-extra-field"><label>Kargo Firması</label><input data-extra-field="cargo_company" value="'+esc(c.cargo_company||'')+'"></div><div class="pie-extra-field" style="margin-top:7px"><label>Müşteri / Anlaşma Kodu</label><input data-extra-field="cargo_code" value="'+esc(c.cargo_code||'')+'"></div><div class="pie-extra-field" style="margin-top:7px"><label>Kargo Notu</label><textarea data-extra-field="cargo_note">'+esc(c.cargo_note||'')+'</textarea></div></div><div class="pie-subbox"><div class="pie-subbox-title">Servis Bilgileri</div><label class="pie-checkline"><input type="checkbox" data-extra-check="service_requested" '+(isTrue(c.service_requested)?'checked':'')+'> Servis talebi var</label><div class="pie-extra-field"><label>Servis Türü</label><input data-extra-field="service_type" value="'+esc(c.service_type||'')+'"></div><div class="pie-extra-field" style="margin-top:7px"><label>İstenen Tarih</label><input type="date" data-extra-field="service_date" value="'+esc(String(c.service_date||'').slice(0,10))+'"></div><div class="pie-extra-field" style="margin-top:7px"><label>Servis Açıklaması</label><textarea data-extra-field="service_description">'+esc(c.service_description||'')+'</textarea></div></div></div><div class="pie-extra-note">Yeni müşteri açarken girilen kargo ve servis bilgileri burada otomatik gelir.</div>';
    card.querySelectorAll('[data-extra-field]').forEach(function(input){var sync=function(){var field=input.dataset.extraField;if(field)c[field]=input.value};input.addEventListener('input',sync);input.addEventListener('change',sync)});
    card.querySelectorAll('[data-extra-check]').forEach(function(input){var sync=function(){var field=input.dataset.extraCheck;if(field)c[field]=input.checked};input.addEventListener('change',sync)});
  }

  function findLegacyTabs(modal){
    return Array.prototype.slice.call(modal.querySelectorAll('.tabs')).find(function(el){var text=String(el.innerText||el.textContent||'');return text.indexOf('Genel')>=0&&text.indexOf('Teklifler')>=0})||null;
  }

  function findLegacyRoot(body,editor,tabs){
    if(!tabs)return null;
    var root=tabs.closest('.detail')||tabs.closest('#detailContent')||tabs.parentElement;
    while(root&&root.parentElement&&root.parentElement!==body&&!root.parentElement.contains(editor)){
      var p=root.parentElement;if(p.querySelector&&p.querySelector('.tabs')===tabs)root=p;else break;
    }
    return root;
  }

  function mountOffers(modal,body,editor){
    var host=getExtraHost(editor);
    if(!host){host=document.createElement('div');host.className='crm-root-extra-host';var note=editor.querySelector('.pie-readonly-note');if(note&&note.parentNode)note.parentNode.insertBefore(host,note);else editor.appendChild(host)}
    var existing=host.querySelector('[data-crm-root-extra="offers"]');
    if(!existing){
      var pane=modal.querySelector('#tabOffers');
      if(pane){pane.classList.remove('hidden');pane.classList.remove('pie-extra-active');pane.setAttribute('data-crm-root-extra','offers');host.appendChild(pane)}
      else{pane=document.createElement('div');pane.setAttribute('data-crm-root-extra','offers');pane.innerHTML='<div class="crm-root-empty">Bu müşteri için teklif alanı hazırlanamadı.</div>';host.appendChild(pane)}
    }
    var legacyTabs=findLegacyTabs(modal);
    if(legacyTabs){
      var legacyRoot=findLegacyRoot(body,editor,legacyTabs);
      var orders=modal.querySelector('#tabOrders');if(orders&&!editor.contains(orders))orders.style.display='none';
      var analysis=modal.querySelector('#tabAnalysis');if(analysis&&!editor.contains(analysis))analysis.style.display='none';
      if(legacyRoot&&legacyRoot!==editor&&!legacyRoot.contains(editor)){legacyRoot.setAttribute('data-hidden-duplicate-customer-panel','1');legacyRoot.style.display='none'}else legacyTabs.style.display='none';
    }
  }

  function updateCustomerTitle(modal){
    var c=currentCustomer(),company=clean(c&&c.company),title=modal.querySelector('.pdem-title'),sub=modal.querySelector('.pdem-sub');
    if(title)title.textContent=company?'Müşteri Kartı — '+company:'Müşteri Kartı';
    if(sub)sub.textContent='Firma bilgileri, cari kart, görüşmeler ve yapılacak işlemler.';
  }

  function buildTabs(editor,sections){
    var old=editor.querySelector('.pie-top-tabs');if(old)old.remove();
    var tabs=document.createElement('div');tabs.className='pie-top-tabs crm-root-tabbar';tabs.setAttribute('role','tablist');
    tabs.innerHTML=TAB_DEFS.map(function(tab,i){return '<button type="button" class="pie-top-tab'+(i===0?' active':'')+'" role="tab" aria-selected="'+(i===0?'true':'false')+'" data-tab-index="'+tab.index+'">'+tab.label+'</button>'}).join('');
    sections[0].parentNode.insertBefore(tabs,sections[0]);
    tabs.addEventListener('click',function(event){var button=event.target&&event.target.closest?event.target.closest('.pie-top-tab'):null;if(!button)return;var index=Number(button.getAttribute('data-tab-index'));activate(editor,sections,index)});
    return tabs;
  }

  function applyLayout(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var body=modal.querySelector('.pdem-body'),editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor)return;
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;

    ensureStyle();
    updateCustomerTitle(modal);
    moveHeaderContent(modal,sections);
    mountCariCard(sections);
    mountInitialExtraFields(sections);
    mountOffers(modal,body,editor);
    syncAnalysisLabels(editor);
    editor.classList.add('pie-tabs-mode','crm-root-tabs');
    var title=editor.querySelector('.pie-title'),sub=editor.querySelector('.pie-sub');
    if(title)title.textContent='Müşteri Bilgileri';
    if(sub)sub.textContent='Yeni müşteri kaydında girilen bilgiler ilgili sekmelerde otomatik gösterilir.';

    if(editor.dataset.crmRootTabsReady!=='1'){
      editor.dataset.crmRootTabsReady='1';
      buildTabs(editor,sections);
      activate(editor,sections,0);
      requestAnimationFrame(function(){body.scrollTop=0;var box=modal.querySelector('.pdem-box');if(box)box.scrollTop=0;modal.scrollTop=0});
    }else{
      var tabs=editor.querySelector('.crm-root-tabbar');
      if(!tabs){buildTabs(editor,sections);activate(editor,sections,0)}
      else activate(editor,sections,Number(editor.dataset.crmRootActiveTab||0));
    }
  }

  var queued=false;
  function schedule(){if(queued)return;queued=true;setTimeout(function(){queued=false;applyLayout()},0)}
  var observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(applyLayout,40)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();