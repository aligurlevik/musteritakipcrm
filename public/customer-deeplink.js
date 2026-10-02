(function(){
  'use strict';
  if(window.__crmCustomerDeepLink)return;
  window.__crmCustomerDeepLink='20261002-v2';

  var params=new URLSearchParams(location.search);
  var id=Number(params.get('editCustomer')||0);
  if(params.get('page')!=='customers'||!id)return;

  var tries=0;
  async function openTarget(){
    if(++tries>40)return;

    var login=document.getElementById('login');
    if(login&&login.classList.contains('show')){
      setTimeout(openTarget,250);
      return;
    }

    if(typeof window.loadCustomers!=='function'||typeof window.editCustomer!=='function'){
      setTimeout(openTarget,150);
      return;
    }

    try{
      var button=document.querySelector('.menu button[data-page="customers"][data-result=""],.menu button[data-page="customers"]');
      if(button&&!button.classList.contains('active'))button.click();
      await window.loadCustomers();
      window.editCustomer(id);

      var modal=document.getElementById('customerModal');
      if(modal&&!modal.classList.contains('open')){
        setTimeout(openTarget,180);
        return;
      }

      try{history.replaceState(null,'',location.pathname+'?page=customers')}catch(_){ }
    }catch(error){
      console.warn('Müşteri kartı otomatik açılamadı',error);
      setTimeout(openTarget,250);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(openTarget,80)},{once:true});
  }else{
    setTimeout(openTarget,80);
  }
})();
