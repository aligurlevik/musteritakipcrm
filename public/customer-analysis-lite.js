(function(){
  'use strict';
  if(window.__crmCustomerAnalysisLite)return;
  window.__crmCustomerAnalysisLite='20261002-lite-v1';

  function clean(v){return String(v==null?'':v).trim()}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  async function api(path,opts){
    var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});
    o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});
    if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';
    var r=await fetch(path,o),d={};
    try{d=await r.json()}catch(_){}
    if(!r.ok)throw new Error(d.error||'İşlem yapılamadı.');
    return d;
  }

  function ensureStyle(){
    if(document.getElementById('crmCustomerAnalysisLiteStyle'))return;
    var style=document.createElement('style');
    style.id='crmCustomerAnalysisLiteStyle';
    style.textContent='\n#portfolioDetailExpandModal .crm-care-satisfaction-card{display:none!important}\n#portfolioDetailExpandModal .crm-analysis-lite-tab{border:0;background:#fff;padding:14px 5px 12px;font-size:14px;font-weight:900;color:#dc2626;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#portfolioDetailExpandModal .crm-analysis-lite-tab:hover{color:#991b1b;background:#fff7f7}\n#portfolioDetailExpandModal .crm-analysis-lite-tab.active{color:#991b1b;border-bottom-color:#dc2626;background:#fff1f2}\n#portfolioDetailExpandModal .crm-analysis-lite-pane{display:none!important}\n#portfolioDetailExpandModal .crm-analysis-lite-pane.active{display:block!important}\n#portfolioDetailExpandModal .crm-analysis-card{border:1px solid #dbe5f0;border-radius:11px;background:#f8fafc;padding:12px}\n#portfolioDetailExpandModal .crm-analysis-title{font-size:14px;font-weight:950;color:#0f172a;margin-bottom:10px}\n#portfolioDetailExpandModal .crm-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n#portfolioDetailExpandModal .crm-analysis-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .crm-analysis-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}\n#portfolioDetailExpandModal .crm-analysis-field select,#portfolioDetailExpandModal .crm-analysis-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:11px;color:#0f172a;outline:none}\n#portfolioDetailExpandModal .crm-analysis-field textarea{min-height:72px;resize:vertical;line-height:1.4}\n#portfolioDetailExpandModal .crm-analysis-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap}\n#portfolioDetailExpandModal .crm-analysis-status{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}\n#portfolioDetailExpandModal .crm-analysis-status.err{color:#dc2626}\n#portfolioDetailExpandModal .crm-analysis-save{border:0;border-radius:8px;padding:9px 12px;background:#1769f6;color:#fff;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-analysis-save:disabled{opacity:.6;cursor:default}\n@media(max-width:1050px){#portfolioDetailExpandModal .crm-analysis-lite-tab{font-size:13px;min-width:125px}}\n@media(max-width:760px){#portfolioDetailExpandModal .crm-analysis-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-analysis-field.wide{grid-column:auto}}';
    document.head.appendChild(style);
  }

  function ensureHost(editor){
    var host=editor.querySelector('.crm-root-extra-host');
    if(!host){
      host=document.createElement('div');
      host.className='crm-root-extra-host';
      var note=editor.querySelector('.pie-readonly-note');
      if(note&&note.parentNode)note.parentNode.insertBefore(host,note);else editor.appendChild(host);
    }
    return host;
  }

  function resetPane(pane){
    pane.querySelector('[data-analysis-satisfaction]').value='';
    pane.querySelector('[data-analysis-complaint-status]').value='';
    pane.querySelector('[data-analysis-complaint-note]').value='';
    pane.querySelector('[data-analysis-loss-reason]').value='';
    pane.dataset.loadedCustomerId='';
    pane.dataset.loadingCustomerId='';
    var status=pane.querySelector('[data-analysis-status]');
    status.textContent='';status.className='crm-analysis-status';
  }

  function ensurePane(editor){
    var host=ensureHost(editor),pane=host.querySelector('.crm-analysis-lite-pane');
    if(!pane){
      pane=document.createElement('div');
      pane.className='crm-analysis-lite-pane';
      pane.setAttribute('data-crm-analysis-lite','1');
      pane.innerHTML='<div class="crm-analysis-card"><div class="crm-analysis-title">📊 Müşteri Analizi</div><div class="crm-analysis-grid"><div class="crm-analysis-field"><label>Memnuniyet Durumu</label><select data-analysis-satisfaction><option value="">Bilinmiyor</option><option value="Memnun">Memnun</option><option value="Kararsız">Kararsız</option><option value="Şikayet Var">Şikayet Var</option></select></div><div class="crm-analysis-field"><label>Şikayet Durumu</label><select data-analysis-complaint-status><option value="">Yok</option><option value="Açık">Açık</option><option value="Çözüldü">Çözüldü</option></select></div><div class="crm-analysis-field wide"><label>Şikayet / Çözüm Notu</label><textarea data-analysis-complaint-note placeholder="Sorun nedir, kim ilgileniyor, nasıl çözüldü?"></textarea></div><div class="crm-analysis-field wide"><label>Kaybedilme Sebebi</label><select data-analysis-loss-reason><option value="">Seçim yok</option><option value="Fiyat">Fiyat</option><option value="Termin">Termin</option><option value="Rakip">Rakip</option><option value="Cevap Vermedi">Cevap Vermedi</option><option value="Kalite / Teknik">Kalite / Teknik</option><option value="Diğer">Diğer</option></select></div></div><div class="crm-analysis-actions"><span class="crm-analysis-status" data-analysis-status></span><button type="button" class="crm-analysis-save" data-analysis-save>Müşteri Analizini Kaydet</button></div></div>';
      host.appendChild(pane);
      pane.querySelector('[data-analysis-save]').addEventListener('click',function(){save(editor,pane)});
    }
    var c=currentCustomer();
    if(c&&c.id&&pane.dataset.customerId!==String(c.id)){
      pane.dataset.customerId=String(c.id);
      resetPane(pane);
    }
    return pane;
  }

  function ensureTab(editor){
    var bar=editor.querySelector('.crm-root-tabbar');
    if(!bar)return null;
    var button=bar.querySelector('.crm-analysis-lite-tab');
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.className='crm-analysis-lite-tab';
    button.textContent='Müşteri Analizi';
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected','false');
    var offers=bar.querySelector('.pie-top-tab[data-tab-index="5"]');
    if(offers)bar.insertBefore(button,offers);else bar.appendChild(button);
    button.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      activate(editor);
      setTimeout(function(){activate(editor)},80);
    });
    return button;
  }

  async function load(editor,pane){
    var c=currentCustomer();
    if(!c||!c.id)return;
    var customerId=String(c.id);
    if(pane.dataset.loadedCustomerId===customerId||pane.dataset.loadingCustomerId===customerId)return;
    pane.dataset.loadingCustomerId=customerId;
    try{
      var d=await api('/api/sales-care?customer_id='+encodeURIComponent(customerId));
      if(pane.dataset.customerId!==customerId)return;
      var s=d.state||{};
      pane.querySelector('[data-analysis-satisfaction]').value=s.satisfaction||'';
      pane.querySelector('[data-analysis-complaint-status]').value=s.complaint_status||'';
      pane.querySelector('[data-analysis-complaint-note]').value=s.complaint_note||'';
      pane.querySelector('[data-analysis-loss-reason]').value=s.loss_reason||'';
      pane.dataset.loadedCustomerId=customerId;
    }catch(e){
      if(pane.dataset.customerId===customerId){var st=pane.querySelector('[data-analysis-status]');st.textContent=e.message;st.className='crm-analysis-status err'}
    }finally{
      if(pane.dataset.loadingCustomerId===customerId)pane.dataset.loadingCustomerId='';
    }
  }

  async function save(editor,pane){
    var c=currentCustomer();
    if(!c||!c.id)return;
    var button=pane.querySelector('[data-analysis-save]'),status=pane.querySelector('[data-analysis-status]');
    button.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-analysis-status';
    try{
      await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'save_state',customer_id:Number(c.id),customer_name:clean(c.company),satisfaction:clean(pane.querySelector('[data-analysis-satisfaction]').value),complaint_status:clean(pane.querySelector('[data-analysis-complaint-status]').value),complaint_note:clean(pane.querySelector('[data-analysis-complaint-note]').value),loss_reason:clean(pane.querySelector('[data-analysis-loss-reason]').value)})});
      pane.dataset.loadedCustomerId=String(c.id);
      status.textContent='Müşteri analizi kaydedildi.';
    }catch(e){status.textContent=e.message;status.className='crm-analysis-status err'}
    finally{button.disabled=false;if(editor.dataset.crmAnalysisLiteActive==='1')setTimeout(function(){activate(editor)},60)}
  }

  function deactivate(editor){
    if(!editor)return;
    editor.dataset.crmAnalysisLiteActive='0';
    var pane=editor.querySelector('.crm-analysis-lite-pane');if(pane)pane.classList.remove('active');
    var button=editor.querySelector('.crm-analysis-lite-tab');if(button){button.classList.remove('active');button.setAttribute('aria-selected','false')}
  }

  function activate(editor){
    if(!editor)return;
    var pane=ensurePane(editor),button=ensureTab(editor);if(!pane||!button)return;
    editor.dataset.crmAnalysisLiteActive='1';
    editor.querySelectorAll('.crm-root-tabbar .pie-top-tab').forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false')});
    button.classList.add('active');button.setAttribute('aria-selected','true');
    editor.querySelectorAll('.pie-section').forEach(function(section){section.classList.remove('crm-root-visible','active-tab-panel');section.removeAttribute('open')});
    var host=ensureHost(editor);host.classList.add('active');
    host.querySelectorAll('[data-crm-root-extra]').forEach(function(p){p.classList.remove('active')});
    pane.classList.add('active');
    var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='none';
    var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display='none';
    load(editor,pane);
  }

  function ensure(){
    ensureStyle();
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    ensurePane(editor);ensureTab(editor);
    if(editor.dataset.crmAnalysisLiteActive==='1')activate(editor);
  }

  function start(){
    ensureStyle();
    document.addEventListener('click',function(event){
      var modal=document.getElementById('portfolioDetailExpandModal'),editor=modal&&modal.querySelector('.pie-editor');
      var normal=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab'):null;
      if(normal&&editor){deactivate(editor);return}
      var opener=event.target&&event.target.closest?event.target.closest('.crm-customer-button'):null;
      if(opener){setTimeout(ensure,80);setTimeout(ensure,220)}
    },true);
    setTimeout(ensure,120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
