(function(){
  'use strict';
  if(window.__crmCustomerDeepLink)return;
  window.__crmCustomerDeepLink='20261002-v3';

  var params=new URLSearchParams(location.search);
  var id=Number(params.get('editCustomer')||0);
  if(params.get('page')!=='customers'||!id)return;

  /* Uygulama yeniden açıldığında aynı otomatik geçiş tekrar tekrar çalışmasın. */
  try{history.replaceState(null,'',location.pathname+'?page=customers')}catch(_){ }

  var started=false;
  var waitLoginCount=0;

  function waitUntilReady(){
    if(started)return;

    var login=document.getElementById('login');
    if(login&&login.classList.contains('show')){
      if(++waitLoginCount<=24)setTimeout(waitUntilReady,250);
      return;
    }

    if(typeof window.editCustomer!=='function'){
      if(++waitLoginCount<=24)setTimeout(waitUntilReady,200);
      return;
    }

    started=true;

    try{
      var button=document.querySelector('.menu button[data-page="customers"][data-result=""],.menu button[data-page="customers"]');
      if(button&&!button.classList.contains('active'))button.click();
    }catch(error){
      console.warn('Müşteriler bölümü açılamadı',error);
    }

    var checks=0;
    function openWhenLoaded(){
      try{
        var ready=false;
        if(typeof allCustomers!=='undefined'&&Array.isArray(allCustomers)){
          ready=allCustomers.some(function(c){return Number(c&&c.id)===id});
        }
        if(ready){
          window.editCustomer(id);
          return;
        }
      }catch(error){
        console.warn('Müşteri kartı kontrolü başarısız',error);
        return;
      }
      if(++checks<=15)setTimeout(openWhenLoaded,160);
    }
    setTimeout(openWhenLoaded,120);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(waitUntilReady,80)},{once:true});
  }else{
    setTimeout(waitUntilReady,80);
  }
})();
