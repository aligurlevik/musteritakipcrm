(function(){
  'use strict';
  if(window.__crmCustomerAnalysisLabels)return;
  window.__crmCustomerAnalysisLabels='20261002-v2';

  function setText(node,text){
    if(node&&node.textContent!==text)node.textContent=text;
  }

  function applyCustomerAnalysisLabels(){
    var card=document.querySelector('#portfolioDetailExpandModal .crm-care-satisfaction-card');
    if(!card)return;

    setText(card.querySelector('.crm-care-card-title'),'📊 Müşteri Analizi');

    var satisfaction=card.querySelector('[data-satisfaction]');
    var satisfactionField=satisfaction?satisfaction.closest('.crm-care-field'):null;
    setText(satisfactionField?satisfactionField.querySelector('label'):null,'Memnuniyet Durumu');

    var lossReason=card.querySelector('[data-loss-reason]');
    var lossField=lossReason?lossReason.closest('.crm-care-field'):null;
    setText(lossField?lossField.querySelector('label'):null,'Kaybedilme Sebebi');

    setText(card.querySelector('[data-sat-save]'),'Müşteri Analizini Kaydet');

    var status=card.querySelector('[data-sat-status]');
    if(status&&status.textContent==='Memnuniyet bilgisi kaydedildi.'){
      status.textContent='Müşteri analizi kaydedildi.';
    }
  }

  var applyTimer=0;
  function scheduleApply(){
    clearTimeout(applyTimer);
    applyTimer=setTimeout(applyCustomerAnalysisLabels,30);
  }

  function start(){
    applyCustomerAnalysisLabels();
    if(document.body){
      var observer=new MutationObserver(scheduleApply);
      observer.observe(document.body,{childList:true,subtree:true});
    }
    document.addEventListener('click',function(event){
      var target=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal [data-sat-save], .crm-customer-button, #portfolioDetailExpandModal .pie-top-tab'):null;
      if(target){
        scheduleApply();
        setTimeout(applyCustomerAnalysisLabels,180);
        setTimeout(applyCustomerAnalysisLabels,450);
      }
    },false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
