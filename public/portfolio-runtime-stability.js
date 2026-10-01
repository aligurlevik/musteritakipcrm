(function(){
  'use strict';
  if(window.__crmPortfolioRuntimeStability)return;
  window.__crmPortfolioRuntimeStability='20261001-stable-v1';

  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}

  function banner(text,type){
    var id='crmPortfolioRuntimeBanner';
    var old=document.getElementById(id);
    if(old)old.remove();
    var main=document.querySelector('main.main')||document.querySelector('.main');
    if(!main)return;
    var box=document.createElement('div');
    box.id=id;
    var ok=type==='ok',warn=type==='warn';
    box.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:9px;font-size:12px;font-weight:900;border:1px solid '+(ok?'#86efac':warn?'#fde68a':'#fecaca')+';background:'+(ok?'#ecfdf5':warn?'#fffbeb':'#fff1f2')+';color:'+(ok?'#166534':warn?'#92400e':'#b91c1c');
    box.textContent=text;
    var head=main.querySelector('.head');
    if(head&&head.nextSibling)main.insertBefore(box,head.nextSibling);else main.prepend(box);
    if(ok)setTimeout(function(){var x=document.getElementById(id);if(x)x.remove()},2200);
  }

  async function fetchJson(url){
    var sep=url.indexOf('?')>=0?'&':'?';
    var r=await fetch(url+sep+'_crm='+Date.now(),{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache','accept':'application/json'}});
    if(r.status===401){location.href='/';throw new Error('Oturum gerekli')}
    var d=null;try{d=await r.json()}catch(_){ }
    if(!r.ok)throw new Error(d&&d.error?d.error:'İşlem başarısız');
    return d;
  }

  async function loadCustomersWithRetry(){
    var lastError=null;
    for(var attempt=0;attempt<3;attempt++){
      try{
        var rows=await fetchJson('/api/customers?status=Tümü');
        if(Array.isArray(rows)&&rows.length>0)return rows;
        if(Array.isArray(rows)&&attempt===2)return rows;
        lastError=new Error('Müşteri servisi boş liste döndürdü.');
      }catch(e){lastError=e}
      await sleep(250*(attempt+1));
    }
    throw lastError||new Error('Müşteriler yüklenemedi.');
  }

  async function loadMeetingsSafe(){
    try{
      var rows=await fetchJson('/api/meetings?status=Tümü');
      return Array.isArray(rows)?rows:[];
    }catch(e){
      banner('Müşteriler yüklendi; görüşme geçmişi geçici olarak alınamadı. Liste kullanılmaya devam edebilir.','warn');
      try{return Array.isArray(meetings)?meetings:[]}catch(_){return []}
    }
  }

  async function stableLoadAll(reselect){
    var previousCustomers=[];
    try{previousCustomers=Array.isArray(customers)?customers.slice():[]}catch(_){ }

    try{
      var customerRows=await loadCustomersWithRetry();
      var meetingRows=await loadMeetingsSafe();

      // Sunucu gerçekten boş döndürürse ekrandaki sağlam listeyi asla 0'a düşürme.
      if(!customerRows.length&&previousCustomers.length){
        banner('Sunucu bu istekte boş cevap verdi; mevcut müşteri listeniz korunuyor.','warn');
        customerRows=previousCustomers;
      }

      customers=customerRows.filter(function(c){return c&&c.record_status!=='Silindi'});
      meetings=meetingRows;

      if(typeof fillFilters==='function')fillFilters();
      if(typeof counts==='function')counts();
      if(typeof render==='function')render();

      var id=reselect||(selected&&selected.id)||(visibleRows&&visibleRows[0]&&visibleRows[0].id);
      if(id&&typeof selectCustomer==='function'){
        try{await selectCustomer(id)}catch(e){console.error('customer detail load failed',e)}
      }

      if(customers.length)banner(customers.length+' müşteri yüklendi.','ok');
      else banner('Müşteri servisi doğrulandı ancak kayıt bulunamadı. Veritabanı kontrolü gerekli.','warn');
    }catch(e){
      console.error('stable portfolio load failed',e);
      if(previousCustomers.length){
        try{
          customers=previousCustomers;
          if(typeof counts==='function')counts();
          if(typeof render==='function')render();
        }catch(_){ }
        banner('Bağlantı hatası oluştu; ekrandaki mevcut müşteri listeniz korunuyor.','warn');
      }else{
        banner('Müşteriler yüklenemedi: '+String(e&&e.message||e),'error');
      }
    }
  }

  window.loadAll=stableLoadAll;

  // Sayfanın kendi ilk loadAll çağrısından sonra bir kez merkezi, dayanıklı yükleme yap.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){stableLoadAll()},0)},{once:true});
  else setTimeout(function(){stableLoadAll()},0);
})();
