(function(){
  'use strict';
  if(window.__crmCustomerAnalysisTabV5)return;
  window.__crmCustomerAnalysisTabV5='20261002-v5';

  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function clean(v){return String(v==null?'':v).trim()}
  async function api(path,opts){var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';var r=await fetch(path,o),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem yapılamadı.');return d}

  function ensureStyle(){
    if(document.getElementById('crmCustomerAnalysisTabStyleV5'))return;
    var style=document.createElement('style');
    style.id='crmCustomerAnalysisTabStyleV5';
    style.textContent=`
#portfolioDetailExpandModal .pie-section .crm-care-satisfaction-card{display:none!important}
#portfolioDetailExpandModal .crm-root-tabbar{grid-template-columns:1fr 1.28fr 1fr 1.15fr 1.05fr .82fr .82fr!important}
#portfolioDetailExpandModal .crm-analysis-tab-v5{border:0;background:#fff;padding:14px 5px 12px;font-size:14px;font-weight:900;color:#dc2626;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#portfolioDetailExpandModal .crm-analysis-tab-v5:hover{color:#991b1b;background:#fff7f7}
#portfolioDetailExpandModal .crm-analysis-tab-v5.active{color:#991b1b;border-bottom-color:#dc2626;background:#fff1f2}
#portfolioDetailExpandModal .crm-customer-analysis-pane-v5{display:none;padding:12px 14px;background:#fff}
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.crm-customer-analysis-pane-v5{display:block!important}
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.pie-section,
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.crm-root-extra-host,
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.crm-mail-v2-pane,
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.crm-mail-fixed-pane,
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.pie-readonly-note,
#portfolioDetailExpandModal .pie-editor.crm-analysis-mode-v5>.pie-actions{display:none!important}
#portfolioDetailExpandModal .crm-analysis-card-v5{border:1px solid #dbe5f0;border-radius:11px;background:#f8fafc;padding:12px}
#portfolioDetailExpandModal .crm-analysis-title-v5{font-size:14px;font-weight:950;color:#0f172a;margin-bottom:10px}
#portfolioDetailExpandModal .crm-analysis-grid-v5{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#portfolioDetailExpandModal .crm-analysis-field-v5.wide{grid-column:1/-1}
#portfolioDetailExpandModal .crm-analysis-field-v5 label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}
#portfolioDetailExpandModal .crm-analysis-field-v5 select,#portfolioDetailExpandModal .crm-analysis-field-v5 textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:11px;color:#0f172a}
#portfolioDetailExpandModal .crm-analysis-field-v5 textarea{min-height:72px;resize:vertical}
#portfolioDetailExpandModal .crm-analysis-actions-v5{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap}
#portfolioDetailExpandModal .crm-analysis-status-v5{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}
#portfolioDetailExpandModal .crm-analysis-status-v5.err{color:#dc2626}
#portfolioDetailExpandModal .crm-analysis-save-v5{border:0;border-radius:8px;padding:9px 12px;background:#1769f6;color:#fff;font-weight:900;cursor:pointer}
@media(max-width:1050px){#portfolioDetailExpandModal .crm-root-tabbar{grid-template-columns:repeat(7,minmax(125px,1fr))!important;overflow-x:auto}#portfolioDetailExpandModal .crm-analysis-tab-v5{font-size:13px}}
@media(max-width:760px){#portfolioDetailExpandModal .crm-analysis-grid-v5{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-analysis-field-v5.wide{grid-column:auto}}
`;
    document.head.appendChild(style);
  }

  function buildPane(editor,bar){
    var pane=editor.querySelector('.crm-customer-analysis-pane-v5');
    if(!pane){
      pane=document.createElement('div');
      pane.className='crm-customer-analysis-pane-v5';
      pane.innerHTML='<div class="crm-analysis-card-v5"><div class="crm-analysis-title-v5">📊 Müşteri Analizi</div><div class="crm-analysis-grid-v5"><div class="crm-analysis-field-v5"><label>Memnuniyet Durumu</label><select data-analysis-satisfaction><option value="">Bilinmiyor</option><option>Memnun</option><option>Kararsız</option><option>Şikayet Var</option></select></div><div class="crm-analysis-field-v5"><label>Şikayet Durumu</label><select data-analysis-complaint-status><option value="">Yok</option><option>Açık</option><option>Çözüldü</option></select></div><div class="crm-analysis-field-v5 wide"><label>Şikayet / Çözüm Notu</label><textarea data-analysis-complaint-note placeholder="Sorun nedir, kim ilgileniyor, nasıl çözüldü?"></textarea></div><div class="crm-analysis-field-v5 wide"><label>Kaybedilme Sebebi</label><select data-analysis-loss-reason><option value="">Seçim yok</option><option>Fiyat</option><option>Termin</option><option>Rakip</option><option>Cevap Vermedi</option><option>Kalite / Teknik</option><option>Diğer</option></select></div></div><div class="crm-analysis-actions-v5"><span class="crm-analysis-status-v5" data-analysis-status></span><button type="button" class="crm-analysis-save-v5" data-analysis-save>Müşteri Analizini Kaydet</button></div></div>';
      pane.querySelector('[data-analysis-save]').addEventListener('click',saveAnalysis);
    }
    if(bar&&bar.parentNode&&bar.nextSibling!==pane)bar.parentNode.insertBefore(pane,bar.nextSibling);
    return pane;
  }

  function clearPane(pane){
    pane.querySelector('[data-analysis-satisfaction]').value='';
    pane.querySelector('[data-analysis-complaint-status]').value='';
    pane.querySelector('[data-analysis-complaint-note]').value='';
    pane.querySelector('[data-analysis-loss-reason]').value='';
    var status=pane.querySelector('[data-analysis-status]');status.textContent='';status.className='crm-analysis-status-v5';
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
      var status=pane.querySelector('[data-analysis-status]');status.textContent=e.message;status.className='crm-analysis-status-v5 err';
    }
  }

  function syncCustomer(pane){
    var c=currentCustomer();
    if(!c||!c.id)return;
    if(pane.dataset.customerId===String(c.id))return;
    pane.dataset.customerId=String(c.id);
    clearPane(pane);
    loadAnalysis(pane,c);
  }

  function forceAnalysisMode(editor,button,pane){
    if(!editor||!button||!pane)return;
    editor.classList.add('crm-analysis-mode-v5');
    editor.dataset.crmAnalysisActive='1';
    editor.querySelectorAll('.crm-root-tabbar .pie-top-tab').forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false')});
    button.classList.add('active');button.setAttribute('aria-selected','true');
    syncCustomer(pane);
  }

  function closeAnalysisMode(editor){
    if(!editor)return;
    editor.classList.remove('crm-analysis-mode-v5');
    editor.dataset.crmAnalysisActive='0';
    var button=editor.querySelector('.crm-analysis-tab-v5');
    if(button){button.classList.remove('active');button.setAttribute('aria-selected','false')}
  }

  function ensureShell(){
    ensureStyle();
    var modal=document.getElementById('portfolioDetailExpandModal');if(!modal)return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    var bar=editor.querySelector('.crm-root-tabbar');if(!bar)return;
    var button=bar.querySelector('.crm-analysis-tab-v5');
    if(!button){
      button=document.createElement('button');
      button.type='button';button.className='crm-analysis-tab-v5';button.textContent='Müşteri Analizi';
      button.setAttribute('role','tab');button.setAttribute('aria-selected','false');
      var offers=bar.querySelector('.pie-top-tab[data-tab-index="5"]');
      if(offers)bar.insertBefore(button,offers);else bar.appendChild(button);
      button.addEventListener('click',function(event){
        event.preventDefault();event.stopPropagation();
        var pane=buildPane(editor,bar);
        forceAnalysisMode(editor,button,pane);
        [60,140,260].forEach(function(delay){setTimeout(function(){forceAnalysisMode(editor,button,pane)},delay)});
        var body=modal.querySelector('.pdem-body');if(body)body.scrollTop=0;
        var box=modal.querySelector('.pdem-box');if(box)box.scrollTop=0;
      });
    }
    var pane=buildPane(editor,bar);
    syncCustomer(pane);
    if(editor.dataset.crmAnalysisActive==='1')forceAnalysisMode(editor,button,pane);
  }

  async function saveAnalysis(){
    var modal=document.getElementById('portfolioDetailExpandModal'),editor=modal&&modal.querySelector('.pie-editor'),pane=editor&&editor.querySelector('.crm-customer-analysis-pane-v5'),c=currentCustomer();
    if(!pane||!c||!c.id)return;
    var status=pane.querySelector('[data-analysis-status]'),button=pane.querySelector('[data-analysis-save]');
    button.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-analysis-status-v5';
    try{
      await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'save_state',customer_id:Number(c.id),customer_name:clean(c.company),satisfaction:clean(pane.querySelector('[data-analysis-satisfaction]').value),complaint_status:clean(pane.querySelector('[data-analysis-complaint-status]').value),complaint_note:clean(pane.querySelector('[data-analysis-complaint-note]').value),loss_reason:clean(pane.querySelector('[data-analysis-loss-reason]').value)})});
      status.textContent='Müşteri analizi kaydedildi.';
    }catch(e){status.textContent=e.message;status.className='crm-analysis-status-v5 err'}
    finally{button.disabled=false}
  }

  var timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(ensureShell,30)}

  function start(){
    ensureStyle();ensureShell();
    if(document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',function(event){
      var normal=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab'):null;
      if(!normal)return;
      var modal=document.getElementById('portfolioDetailExpandModal'),editor=modal&&modal.querySelector('.pie-editor');
      closeAnalysisMode(editor);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
