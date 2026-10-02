(function(){
  'use strict';
  if(window.__crmPortfolioCustomerJump)return;
  window.__crmPortfolioCustomerJump='20261002-v4';

  function customerIdFromRow(row){
    var raw=String(row&&row.getAttribute('onclick')||'');
    var m=raw.match(/selectCustomer\((\d+)\)/);
    return m?Number(m[1]):0;
  }

  function openCustomerNow(id){
    try{
      var list=(typeof customers!=='undefined'&&Array.isArray(customers))?customers:[];
      var found=list.find(function(c){return Number(c&&c.id)===Number(id)});
      if(!found)return false;

      selected=found;
      try{selectedHistory={meetings:[],offers:[]}}catch(_){ }

      if(typeof loadSelected==='function')loadSelected();
      if(typeof render==='function')render();

      fetch('/api/customers/'+encodeURIComponent(id)+'/history',{
        credentials:'same-origin',
        cache:'no-store',
        headers:{'cache-control':'no-cache'}
      }).then(function(r){
        if(!r.ok)throw new Error('history '+r.status);
        return r.json();
      }).then(function(data){
        try{
          if(!selected||Number(selected.id)!==Number(id))return;
          selectedHistory=data||{meetings:[],offers:[]};
          if(typeof renderHistory==='function')renderHistory();
          if(typeof renderAnalysis==='function')renderAnalysis();
        }catch(_){ }
      }).catch(function(error){
        console.warn('Müşteri geçmişi yüklenemedi, kart yine de açık kalacak.',error);
      });
      return true;
    }catch(error){
      console.error('Müşteri kartı açılamadı',error);
      return false;
    }
  }

  document.addEventListener('click',function(event){
    var name=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!name)return;
    var row=name.closest('tr'),id=customerIdFromRow(row);
    if(!id)return;

    event.preventDefault();
    event.stopPropagation();

    if(!openCustomerNow(id)&&typeof window.selectCustomer==='function'){
      Promise.resolve(window.selectCustomer(id)).catch(function(error){
        console.error('Müşteri detayı açılamadı',error);
      });
    }
  },true);

  var style=document.createElement('style');
  style.id='crmPortfolioCustomerJumpStyle';
  style.textContent='#rows .company{cursor:pointer;color:#1769f6;text-decoration:underline;text-underline-offset:2px}#rows .company:hover{color:#0f4fc4}';
  document.head.appendChild(style);
})();
