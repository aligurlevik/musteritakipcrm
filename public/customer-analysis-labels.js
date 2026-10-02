(function(){
  'use strict';
  if(window.__crmCustomerAnalysisTabV4)return;
  window.__crmCustomerAnalysisTabV4='20261002-v4';

  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function clean(v){return String(v==null?'':v).trim()}
  async function api(path,opts){var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';var r=await fetch(path,o),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem yapılamadı.');return d}

  function ensureStyle(){
    if(document.getElementById('crmCustomerAnalysisTabStyle'))return;
    var style=document.createElement('style');
    style.id='crmCustomerAnalysisTabStyle';
    style.textContent=`
#portfolioDetailExpandModal .pie-section .crm-care-satisfaction-card{display:none!important}
#portfolioDetailExpandModal .crm-root-tabbar{grid-template-columns:1fr 1.28fr 1fr 1.15fr 1.05fr .82fr .82fr!important}
#portfolioDetailExpandModal .crm-analysis-tab{border:0;background:#fff;padding:14px 5px 12px;font-size:14px;font-weight:900;color:#dc2626;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#portfolioDetailExpandModal .crm-analysis-tab:hover{color:#991b1b;background:#fff7f7}
#portfolioDetailExpandModal .crm-analysis-tab.active{color:#991b1b;border-bottom-color:#dc2626;background:#fff1f2}
#portfolioDetailExpandModal .crm-customer-analysis-pane{display:none;padding:12px 14px;background:#fff}
#portfolioDetailExpandModal .crm-customer-analysis-pane.active{display:block}
#portfolioDetailExpandModal .crm-analysis-card{border:1px solid #dbe5f0;border-radius:11px;background:#f8fafc;padding:12px}
#portfolioDetailExpandModal .crm-analysis-title{font-size:14px;font-weight:950;color:#0f172a;margin-bottom:10px}
#portfolioDetailExpandModal .crm-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#portfolioDetailExpandModal .crm-analysis-field.wide{grid-column:1/-1}
#portfolioDetailExpandModal .crm-analysis-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}
#portfolioDetailExpandModal .crm-analysis-field select,#portfolioDetailExpandModal .crm-analysis-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:11px;color:#0f172a}
#portfolioDetailExpandModal .crm-analysis-field textarea{min-height:72px;resize:vertical}
#portfolioDetailExpandModal .crm-analysis-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap}
#portfolioDetailExpandModal .crm-analysis-status{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}
#portfolioDetailExpandModal .crm-analysis-status.err{color:#dc2626}
#portfolioDetailExpandModal .crm-analysis-save{border:0;border-radius:8px;padding:9px 12px;background:#1769f6;color:#fff;font-weight:900;cursor:pointer}
@media(max-width:1050px){#portfolioDetailExpandModal .crm-root-tabbar{grid-template-columns:repeat(7,minmax(125px,1fr))!important;overflow-x:auto}#portfolioDetailExpandModal .crm-analysis-tab{font-size:13px}}
@media(max-width:760px){#portfolioDetailExpandModal .crm-analysis-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-analysis-field.wide{grid-column:auto}}
`;
    document.head.appendChild(style);
  }

  function buildPane(editor){
    var pane=editor.querySelector('.crm-customer-analysis-pane');
    if(pane)return pane;
    pane=document.createElement('div');
    pane.className='crm-customer-analysis-pane';
    pane.innerHTML='<div class="crm-analysis-card"><div class="crm-analysis-title">📊 Müşteri Analizi</div><div class="crm-analysis-grid"><div class="crm-analysis-field"><label>Memnuniyet Durumu</label><select data-analysis-satisfaction><option value="">Bilinmiyor</option><option>Memnun</option><option>Kararsız</option><option>Şikayet Var</option></select></div><div class="crm-analysis-field"><label>Şikayet Durumu</label><select data-analysis-complaint-status><option value="">Yok</option><option>Açık</option><option>Çözüldü</option></select></div><div class="crm-analysis-field wide"><label>Şikayet / Çözüm Notu</label><textarea data-analysis-complaint-note placeholder="Sorun nedir, kim ilgileniyor, nasıl çözüldü?"></textarea></div><div class="crm-analysis-field wide"><label>Kaybedilme Sebebi</label><select data-analysis-loss-reason><option value="">Seçim yok</option><option>Fiyat</option><option>Termin</option><option>Rakip</option><option>Cevap Vermedi</option><option>Kalite / Teknik</option><option>Diğer</option></select></div></div><div class="crm-analysis-actions"><span class="crm-analysis-status" data-analysis-status></span><button type="button" class="crm-analysis-save" data-analysis-save>Müşteri Analizini Kaydet</button></div></div>';
    var firstSection=editor.querySelector('.pie-section');
    if(firstSection)editor.insertBefore(pane,firstSection);else editor.appendChild(pane);
    pane.querySelector('[data-analysis-save]').addEventListener('click',saveAnalysis);
    return pane;
  }

  function ensureTab(editor){
    var bar=editor.querySelector('.crm-root-tabbar');
    if(!bar)return null;
    var button=bar.querySelector('.crm-analysis-tab');
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.className='crm-analysis-tab';
    button.textContent='Müşteri Analizi';
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected','false');
    var offers=bar.querySelector('.pie-top-tab[data-tab-index="5"]');
    if(offers)bar.insertBefore(button,offers);else bar.appendChild(button);
    button.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      activateAnalysis(editor);
      setTimeout(function(){activateAnalysis(editor)},70);
      setTimeout(function(){activateAnalysis(editor)},160);
    });
    return button;
  }

  function deactivateAnalysis(editor){
    if(!editor)return;
    editor.dataset.crmAnalysisActive='0';
    var pane=editor.querySelector('.crm-customer-analysis-pane');if(pane)pane.classList.remove('active');
    var button=editor.querySelector('.crm-analysis-tab');if(button){button.classList.remove('active');button.setAttribute('aria-selected','false')}
    editor.querySelectorAll('.crm-mail-v2-pane,.crm-mail-fixed-pane').forEach(function(p){p.style.removeProperty('display')});
  }

  function activateAnalysis(editor){
    if(!editor)return;
    var pane=buildPane(editor),button=ensureTab(editor);if(!pane||!button)return;
    editor.dataset.crmAnalysisActive='1';
    editor.querySelectorAll('.crm-root-tabbar .pie-top-tab').forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false')});
    button.classList.add('active');button.setAttribute('aria-selected','true');
    editor.querySelectorAll('.pie-section').forEach(function(section){section.classList.remove('crm-root-visible','active-tab-panel');section.removeAttribute('open')});
    var extra=editor.querySelector('.crm-root-extra-host');if(extra)extra.classList.remove('active');
    editor.querySelectorAll('[data-crm-root-extra]').forEach(function(p){p.classList.remove('active')});
    editor.querySelectorAll('.crm-mail-v2-pane,.crm-mail-fixed-pane').forEach(function(p){p.style.setProperty('display','none','important')});
    var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='none';
    var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display='none';
    pane.classList.add('active');
  }

  function clearPane(pane){
    pane.querySelector('[data-analysis-satisfaction]').value='';
    pane.querySelector('[data-analysis-complaint-status]').value='';
    pane.querySelector('[data-analysis-complaint-note]').value='';
    pane.querySelector('[data-analysis-loss-reason]').value='';
    var status=pane.querySelector('[data-analysis-status]');status.textContent='';status.className='crm-analysis-status';
  }

  async function loadAnalysis(pane,c){
    if(!pane||!c||!c.id)return;
    try{
      var d=await api('/api/sales-care?customer_id='+encodeURIComponent(c.id)),s=d.state||{};
      if(pane.dataset.customerId!==String(c.id))return;
      pane.querySelector('[data-analysis-satisfaction]').value=s.satisfaction||'';
      pane.querySelector('[data-analysis-complaint-status]').value=s.complaint_status||'';
      pane.querySelector('[data-analysis-complaint-note]').value=s.complaint_note||'';
      pane.querySelector('[data-analysis-loss-reason]').value=s.loss_reason||'';
    }catch(e){
      var status=pane.querySelector('[data-analysis-status]');status.textContent=e.message;status.className='crm-analysis-status err';
    }
  }

  async function saveAnalysis(){
    var modal=document.getElementById('portfolioDetailExpandModal'),editor=modal&&modal.querySelector('.pie-editor'),pane=editor&&editor.querySelector('.crm-customer-analysis-pane'),c=currentCustomer();
    if(!pane||!c||!c.id)return;
    var status=pane.querySelector('[data-analysis-status]'),button=pane.querySelector('[data-analysis-save]');
    button.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-analysis-status';
    try{
      await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'save_state',customer_id:Number(c.id),customer_name:clean(c.company),satisfaction:clean(pane.querySelector('[data-analysis-satisfaction]').value),complaint_status:clean(pane.querySelector('[data-analysis-complaint-status]').value),complaint_note:clean(pane.querySelector('[data-analysis-complaint-note]').value),loss_reason:clean(pane.querySelector('[data-analysis-loss-reason]').value)})});
      status.textContent='Müşteri analizi kaydedildi.';
    }catch(e){status.textContent=e.message;status.className='crm-analysis-status err'}
    finally{button.disabled=false;setTimeout(function(){if(editor&&editor.dataset.crmAnalysisActive==='1')activateAnalysis(editor)},80)}
  }

  function ensure(){
    ensureStyle();
    var modal=document.getElementById('portfolioDetailExpandModal');if(!modal)return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    var pane=buildPane(editor);ensureTab(editor);
    var c=currentCustomer();
    if(c&&c.id&&pane.dataset.customerId!==String(c.id)){
      pane.dataset.customerId=String(c.id);clearPane(pane);loadAnalysis(pane,c);
    }
    if(editor.dataset.crmAnalysisActive==='1')setTimeout(function(){activateAnalysis(editor)},60);
  }

  var timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(ensure,35)}

  function start(){
    ensureStyle();
    ensure();
    if(document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    setInterval(ensure,300);
    document.addEventListener('click',function(event){
      var modal=document.getElementById('portfolioDetailExpandModal'),editor=modal&&modal.querySelector('.pie-editor');if(!editor)return;
      var normal=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab'):null;
      if(normal){deactivateAnalysis(editor);return}
      if(editor.dataset.crmAnalysisActive==='1')setTimeout(function(){activateAnalysis(editor)},80);
      schedule();
    },false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
