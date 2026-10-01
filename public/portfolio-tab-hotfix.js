(function(){
  'use strict';
  if(window.__crmPortfolioTabHotfix)return;
  window.__crmPortfolioTabHotfix='20261001-v2';

  function editor(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return null;
    return modal.querySelector('.pie-editor');
  }

  function setActive(ed,index){
    ed.querySelectorAll('.pie-top-tab').forEach(function(btn){
      var idx=Number(btn.getAttribute('data-tab-index'));
      var active=idx===index;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function closeMail(ed){
    ed.querySelectorAll('.crm-mail-v2-pane').forEach(function(p){
      p.style.setProperty('display','none','important');
    });
    ed.querySelectorAll('.crm-mail-fixed-pane').forEach(function(p){
      p.classList.remove('active');
      p.style.setProperty('display','none','important');
    });
  }

  function openMail(ed){
    ed.querySelectorAll('.crm-mail-v2-pane,.crm-mail-fixed-pane').forEach(function(p){
      p.style.removeProperty('display');
    });
  }

  function stabilize(index){
    var ed=editor();
    if(!ed)return;
    if(index===6)openMail(ed);else closeMail(ed);
    setActive(ed,index);
  }

  function onTab(event){
    var button=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null;
    if(!button)return;
    var index=Number(button.getAttribute('data-tab-index'));
    if(!Number.isFinite(index))return;

    // Tek seferlik düzeltmeler: sürekli MutationObserver yok.
    // Böylece eski mail koduyla karşılıklı class değiştirip ekranı titreştirmez.
    stabilize(index);
    setTimeout(function(){stabilize(index)},70);
    setTimeout(function(){stabilize(index)},180);
  }

  document.addEventListener('click',onTab,true);

  document.addEventListener('click',function(event){
    var customerBtn=event.target&&event.target.closest?event.target.closest('.detail-actions .crm-customer-button'):null;
    if(customerBtn)setTimeout(function(){stabilize(0)},180);
  },true);
})();
