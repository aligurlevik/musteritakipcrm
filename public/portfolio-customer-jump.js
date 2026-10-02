(function(){
  'use strict';
  if(window.__crmPortfolioCustomerJump)return;
  window.__crmPortfolioCustomerJump='20261002-v5';

  function customerIdFromRow(row){
    var raw=String(row&&row.getAttribute('onclick')||'');
    var m=raw.match(/selectCustomer\((\d+)\)/);
    return m?Number(m[1]):0;
  }

  async function fetchJson(url){
    var r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(!r.ok)throw new Error(url+' '+r.status);
    return r.json();
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

      fetchJson('/api/customers/'+encodeURIComponent(id)+'/history').then(function(data){
        try{
          if(!selected||Number(selected.id)!==Number(id))return;
          selectedHistory=data||{meetings:[],offers:[]};
          if(typeof renderHistory==='function')renderHistory();
          if(typeof renderAnalysis==='function')renderAnalysis();
        }catch(_){ }
      }).catch(function(error){
        console.warn('Müşteri geçmişi yüklenemedi, kart açık kalacak.',error);
      });
      return true;
    }catch(error){
      console.error('Müşteri kartı açılamadı',error);
      return false;
    }
  }

  async function recoverPortfolioIfEmpty(){
    try{
      var current=(typeof customers!=='undefined'&&Array.isArray(customers))?customers:[];
      var rows=document.querySelectorAll('#rows tr');
      if(current.length&&rows.length)return;

      var loaded=await fetchJson('/api/customers?status=T%C3%BCm%C3%BC');
      var list=Array.isArray(loaded)?loaded:(loaded&&Array.isArray(loaded.customers)?loaded.customers:[]);
      if(typeof customers!=='undefined'){
        customers=list.filter(function(c){return c&&c.record_status!=='Silindi'});
      }

      try{
        var loadedMeetings=await fetchJson('/api/meetings?status=T%C3%BCm%C3%BC');
        if(typeof meetings!=='undefined')meetings=Array.isArray(loadedMeetings)?loadedMeetings:[];
      }catch(error){
        console.warn('Görüşmeler yüklenemedi; müşteri listesi yine gösterilecek.',error);
        try{if(typeof meetings!=='undefined')meetings=[]}catch(_){ }
      }

      if(typeof fillFilters==='function')fillFilters();
      if(typeof counts==='function')counts();
      if(typeof render==='function')render();

      var finalList=(typeof customers!=='undefined'&&Array.isArray(customers))?customers:[];
      if(finalList.length&&(!selected||!selected.id))openCustomerNow(finalList[0].id);
    }catch(error){
      console.error('Müşteri listesi geri yüklenemedi',error);
      var reminder=document.getElementById('sideReminders');
      if(reminder)reminder.textContent='Müşteriler yüklenemedi. Yenile butonunu deneyin.';
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

  setTimeout(recoverPortfolioIfEmpty,300);
})();
