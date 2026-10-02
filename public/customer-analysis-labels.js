(function(){
  'use strict';
  if(window.__crmCustomerAnalysisLabels)return;
  window.__crmCustomerAnalysisLabels='20261002-v1';

  function applyCustomerAnalysisLabels(){
    var card=document.querySelector('#portfolioDetailExpandModal .crm-care-satisfaction-card');
    if(!card)return;

    var title=card.querySelector('.crm-care-card-title');
    if(title)title.textContent='📊 Müşteri Analizi';

    var satisfaction=card.querySelector('[data-satisfaction]');
    var satisfactionField=satisfaction?satisfaction.closest('.crm-care-field'):null;
    var satisfactionLabel=satisfactionField?satisfactionField.querySelector('label'):null;
    if(satisfactionLabel)satisfactionLabel.textContent='Memnuniyet Durumu';

    var lossReason=card.querySelector('[data-loss-reason]');
    var lossField=lossReason?lossReason.closest('.crm-care-field'):null;
    var lossLabel=lossField?lossField.querySelector('label'):null;
    if(lossLabel)lossLabel.textContent='Kaybedilme Sebebi';

    var saveButton=card.querySelector('[data-sat-save]');
    if(saveButton)saveButton.textContent='Müşteri Analizini Kaydet';

    var status=card.querySelector('[data-sat-status]');
    if(status){
      if(status.textContent==='Memnuniyet bilgisi kaydedildi.')status.textContent='Müşteri analizi kaydedildi.';
      if(!status.dataset.analysisStatusWatcher){
        status.dataset.analysisStatusWatcher='1';
        new MutationObserver(function(){
          if(status.textContent==='Memnuniyet bilgisi kaydedildi.')status.textContent='Müşteri analizi kaydedildi.';
        }).observe(status,{childList:true,characterData:true,subtree:true});
      }
    }
  }

  function scheduleApply(){
    [0,120,350,700].forEach(function(delay){
      setTimeout(applyCustomerAnalysisLabels,delay);
    });
  }

  function start(){
    applyCustomerAnalysisLabels();
    if(document.body){
      new MutationObserver(function(){applyCustomerAnalysisLabels()})
        .observe(document.body,{childList:true,subtree:true});
    }
    document.addEventListener('click',function(event){
      var target=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal [data-sat-save], .crm-customer-button, #portfolioDetailExpandModal .pie-top-tab'):null;
      if(target)scheduleApply();
    },false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
